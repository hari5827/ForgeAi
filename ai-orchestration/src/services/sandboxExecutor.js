import { executeActions } from "./sandboxClient.js";

export async function executeAction(sandboxId, action) {
    const result = await executeActions(sandboxId, [action]);

    return result.results?.[0] || result;
}