import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function validatePath(filePath) {
    if (!filePath || filePath.startsWith("/") || filePath.includes("..")) {
        throw new Error("Invalid file path");
    }
}

async function execCommand(podName, command) {
    try {
        const { stdout, stderr } = await execFileAsync(
            "kubectl",
            [
                "exec",
                podName,
                "-c",
                "sandbox",
                "--",
                "sh",
                "-c",
                command
            ],
            {
                maxBuffer: 10 * 1024 * 1024
            }
        );

        return {
            stdout,
            stderr
        };
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

            const encoded = Buffer
                .from(action.content)
                .toString("base64");

            await execCommand(
                podName,
                `mkdir -p "$(dirname '${action.path}')" && echo '${encoded}' | base64 -d > '${action.path}'`
            );

            return {
                action: action.action,
                path: action.path,
                status: "success"
            };
        }

        case "delete_file": {
            validatePath(action.path);

            await execCommand(
                podName,
                `rm -f '${action.path}'`
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

            const result = await execCommand(
                podName,
                action.command
            );

            return {
                action: "run_command",
                status: "success",
                stdout: result.stdout,
                stderr: result.stderr
            };
        }

        default:
            throw new Error(
                `Unsupported action: ${action.action}`
            );
    }
}