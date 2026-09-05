const SANDBOX_SERVER_URL =
    process.env.SANDBOX_SERVER_URL || "http://localhost:3001";

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
    const errorBody = await response.text();

    throw new Error(
        `Action execution failed: ${response.status} - ${errorBody}`
    );
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

export async function getSandboxStatus(sandboxId) {
    const response = await fetch(
        `http://localhost:3001/api/sandbox/${sandboxId}/status`
    );

    const data = await response.json();

    if (response.status === 404) {
        return {
            exists: false,
            status: "not_found"
        };
    }

    if (!response.ok) {
    console.log("SANDBOX STATUS RESPONSE:", {
        status: response.status,
        data
    });

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