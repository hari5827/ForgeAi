const SANDBOX_SERVER_URL =
    process.env.SANDBOX_SERVER_URL ||
    "http://localhost:3001";


/*
 * Create sandbox
 */
export async function createSandbox() {
    const response = await fetch(
        `${SANDBOX_SERVER_URL}/api/sandbox/start`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    if (!response.ok) {
        const errorBody =
            await response.text();

        throw new Error(
            `Sandbox creation failed: ${response.status} - ${errorBody}`
        );
    }

    return response.json();
}


/*
 * Execute AI actions inside sandbox
 */
export async function executeActions(
    sandboxId,
    actions
) {
    const response = await fetch(
        `${SANDBOX_SERVER_URL}/api/sandbox/${sandboxId}/execute`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ actions })
        }
    );

    if (!response.ok) {
        const errorBody =
            await response.text();

        throw new Error(
            `Action execution failed: ${response.status} - ${errorBody}`
        );
    }

    return response.json();
}


/*
 * Get sandbox status
 */
export async function getSandboxStatus(
    sandboxId
) {
    const response = await fetch(
        `${SANDBOX_SERVER_URL}/api/sandbox/${sandboxId}/status`
    );

    const data =
        await response.json();

    if (response.status === 404) {
        return {
            exists: false,
            status: "not_found"
        };
    }

    if (!response.ok) {
        console.log(
            "SANDBOX STATUS RESPONSE:",
            {
                status: response.status,
                data
            }
        );

        throw new Error(
            data.error ||
            data.message ||
            `Sandbox status check failed: ${response.status}`
        );
    }

    return {
        exists: true,
        status: data.status
    };
}


/*
 * Delete sandbox
 */
export async function deleteSandbox(
    sandboxId
) {
    const response = await fetch(
        `${SANDBOX_SERVER_URL}/api/sandbox/${sandboxId}`,
        {
            method: "DELETE"
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Sandbox deletion failed: ${response.status}`
        );
    }

    return data;
}


/*
 * List files inside sandbox
 *
 * Returns:
 * {
 *   files: [
 *      "src/App.jsx",
 *      "src/App.css",
 *      ...
 *   ]
 * }
 */
export async function listSandboxFiles(
    sandboxId
) {
    const response = await fetch(
        `${SANDBOX_SERVER_URL}/api/sandbox/${sandboxId}/files`
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Failed to list sandbox files: ${response.status}`
        );
    }

    if (!Array.isArray(data.files)) {
        throw new Error(
            "Sandbox file listing is invalid"
        );
    }

    return data.files;
}


/*
 * Read a file from sandbox
 *
 * Returns:
 * {
 *   path: "src/App.jsx",
 *   content: "..."
 * }
 */
export async function readSandboxFile(
    sandboxId,
    filePath
) {
    const encodedPath =
        filePath
            .split("/")
            .map(
                (segment) =>
                    encodeURIComponent(segment)
            )
            .join("/");

    const response = await fetch(
        `${SANDBOX_SERVER_URL}/api/sandbox/${sandboxId}/files/${encodedPath}`
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Failed to read sandbox file: ${response.status}`
        );
    }

    return data;
}