import { k8sCoreV1Api } from "./config.js";

export async function cleanupExpiredSandboxes() {
    const now = Date.now();

    const podsResponse = await k8sCoreV1Api.listNamespacedPod({
        namespace: "default",
        labelSelector: "sandboxId"
    });

    for (const pod of podsResponse.items) {
        const expiresAt = Number(pod.metadata?.labels?.expiresAt);
        const sandboxId = pod.metadata?.labels?.sandboxId;

        if (!sandboxId || !expiresAt || expiresAt > now) {
            continue;
        }

        console.log(`Cleaning expired sandbox: ${sandboxId}`);

        try {
            await k8sCoreV1Api.deleteNamespacedPod({
                name: pod.metadata.name,
                namespace: "default"
            });

            await k8sCoreV1Api.deleteNamespacedService({
                name: `sandbox-service-${sandboxId}`,
                namespace: "default"
            });

            console.log(`Sandbox ${sandboxId} cleaned`);
        } catch (error) {
            console.error(
                `Failed to cleanup sandbox ${sandboxId}:`,
                error.message
            );
        }
    }
}