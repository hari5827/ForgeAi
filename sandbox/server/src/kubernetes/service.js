import { k8sCoreV1Api } from "./config.js";

export async function createService(sandboxId) {
    const expiresAt = Date.now() + 30 * 60 * 1000;

    const serviceManifest = {
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                sandboxId,
                expiresAt: String(expiresAt)
            }
        },

        spec: {
            selector: {
                sandboxId
            },

            ports: [
                {
                    name: "frontend",
                    port: 5173,
                    targetPort: 5173
                }
            ],

            type: "ClusterIP"
        }
    };

    return k8sCoreV1Api.createNamespacedService({
        namespace: "default",
        body: serviceManifest
    });
}