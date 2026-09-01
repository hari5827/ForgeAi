const SANDBOX_SERVER_URL = "http://localhost:3001";

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
        throw new Error(`Sandbox creation failed: ${response.status}`);
    }

    return response.json();
}

export async function executeActions(sandboxId, actions) {
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
        throw new Error(`Action execution failed: ${response.status}`);
    }

    return response.json();
}