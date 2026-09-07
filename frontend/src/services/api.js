const AI_API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:4000";

const SANDBOX_API_URL =
    import.meta.env.VITE_SANDBOX_URL || "http://localhost:3001";

 function encodeFilePath(filePath) {
    return filePath
        .split("/")
        .map(encodeURIComponent)
        .join("/");
}

async function parseResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}

export async function createSandbox() {
    const response = await fetch(
        `${SANDBOX_API_URL}/api/sandbox/start`,
        {
            method: "POST"
        }
    );

    return parseResponse(response);
}

export async function listFiles(sandboxId) {
    const response = await fetch(
        `${SANDBOX_API_URL}/api/sandbox/${sandboxId}/files`
    );

    return parseResponse(response);
}

export async function readFile(sandboxId, filePath) {
    const encodedPath = encodeFilePath(filePath);

    const response = await fetch(
        `${SANDBOX_API_URL}/api/sandbox/${sandboxId}/files/${encodedPath}`
    );

    return parseResponse(response);
}

export async function writeFile(
    sandboxId,
    filePath,
    content
) {
    const encodedPath = encodeFilePath(filePath);

    const response = await fetch(
        `${SANDBOX_API_URL}/api/sandbox/${sandboxId}/files/${encodedPath}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content })
        }
    );

    return parseResponse(response);
}

export async function createAIPlan(
    token,
    sessionId,
    prompt
) {
    const response = await fetch(
        `${AI_API_URL}/api/ai/plan`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                sessionId,
                prompt
            })
        }
    );

    return parseResponse(response);
}

export async function getSessionSandbox(token, sessionId) {
    const response = await fetch(
        `${AI_API_URL}/api/ai/sessions/${sessionId}/sandbox`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return parseResponse(response);
}

export async function getSessionHistory(token, sessionId) {
    const response = await fetch(
        `${AI_API_URL}/api/ai/sessions/${sessionId}/history`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return parseResponse(response);
}

export async function executeCommand(sandboxId, command) {
    const response = await fetch(
        `${SANDBOX_API_URL}/api/sandbox/${sandboxId}/execute`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                actions: [
                    {
                        action: "run_command",
                        command
                    }
                ]
            })
        }
    );

    return parseResponse(response);
}