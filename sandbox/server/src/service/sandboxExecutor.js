import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function validatePath(filePath) {
    if (!filePath || filePath.startsWith("/") || filePath.includes("..")) {
        throw new Error("Invalid file path");
    }
}
async function execScript(podName, script, args = [], input) {
    try {
        const { stdout, stderr } = await execFileAsync(
            "kubectl",
            [
                "exec",
                podName,
                "-c",
                "sandbox",
                ...(input !== undefined ? ["-i"] : []),
                "--",
                "sh",
                "-c",
                script,
                "--", // marks end of options for sh; remaining args become $1, $2, ...
                ...args
            ],
            {
                maxBuffer: 10 * 1024 * 1024,
                input
            }
        );

        return { stdout, stderr };
    } catch (error) {
        throw new Error(
            error.stderr?.toString() ||
            error.stdout?.toString() ||
            error.message
        );
    }
}


async function execCommand(podName, command) {
    try {
        const { stdout, stderr } = await execFileAsync(
            "kubectl",
            ["exec", podName, "-c", "sandbox", "--", "sh", "-c", command],
            { maxBuffer: 10 * 1024 * 1024 }
        );

        return { stdout, stderr };
    } catch (error) {
        throw new Error(
            error.stderr?.toString() ||
            error.stdout?.toString() ||
            error.message
        );
    }
}

export async function executeAction(sandboxId, action) {
    const podName = `sandbox-pod-${sandboxId}`;

    switch (action.action) {

        case "create_file":
        case "update_file": {
            validatePath(action.path);

            if (typeof action.content !== "string") {
                throw new Error("File content is required");
            }
            await execScript(
                podName,
                'mkdir -p "$(dirname "$1")" && base64 -d > "$1"',
                [action.path],
                Buffer.from(action.content).toString("base64")
            );

            return {
                action: action.action,
                path: action.path,
                status: "success"
            };
        }

        case "delete_file": {
            validatePath(action.path);

            await execScript(
                podName,
                'rm -f "$1"',
                [action.path]
            );

            return {
                action: "delete_file",
                path: action.path,
                status: "success"
            };
        }

        case "run_command": {
            if (!action.command) {
                throw new Error("Command is required");
            }

            const result = await execCommand(podName, action.command);

            return {
                action: "run_command",
                status: "success",
                stdout: result.stdout,
                stderr: result.stderr
            };
        }

        default:
            throw new Error(`Unsupported action: ${action.action}`);
    }
}
