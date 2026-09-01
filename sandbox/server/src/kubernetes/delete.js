import { k8sCoreV1Api } from "./config.js";

export async function deleteSandbox(sandboxId) {
    try {
        await k8sCoreV1Api.deleteNamespacedPod({
            name: `sandbox-pod-${sandboxId}`,
            namespace: "default"
        });
    } catch (error) {
        if (error.code !== 404) {
            throw error;
        }
    }

    try {
        await k8sCoreV1Api.deleteNamespacedService({
            name: `sandbox-service-${sandboxId}`,
            namespace: "default"
        });
    } catch (error) {
        if (error.code !== 404) {
            throw error;
        }
    }
}