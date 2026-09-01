import { k8sExec } from "../kubernetes/config.js";

function validatePath(filePath) {
    if (!filePath || filePath.startsWith("/") || filePath.includes("..")) {
        throw new Error("Invalid file path");
    }
}

function execCommand(podName, command) {
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";

        const stdoutStream = {
            write: (data) => {
                stdout += data;
            }
        };

        const stderrStream = {
            write: (data) => {
                stderr += data;
            }
        };

        k8sExec.exec(
            "default",
            podName,
            "sandbox",
            ["sh", "-c", command],
            stdoutStream,
            stderrStream,
            null,
            false,
            (status) => {
                if (status?.status === "Success") {
                    resolve({ stdout, stderr });
                } else {
                    reject(
                        new Error(
                            stderr || `Command failed: ${command}`
                        )
                    );
                }
            }
        );
    });
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