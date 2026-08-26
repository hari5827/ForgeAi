

import { k8sCoreV1Api } from "./config.js";

export const createService = async (sandboxId) => {
    console.log("CREATING SERVICE:", sandboxId);

    const serviceManifest = {
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                sandboxId: sandboxId
            }
        },

        spec: {
            selector: {
                sandboxId: sandboxId
            },

            ports: [
                {
                    name: "http",
                    port: 80,
                    targetPort: 5173,
                    protocol: "TCP"
                },
                {
                    name: "agent-http",
                    port: 3000,
                    targetPort: 3000,
                    protocol: "TCP"
                }
            ],

            type: "ClusterIP"
        }
    };

    try {
        const response = await k8sCoreV1Api.createNamespacedService({
            namespace: "default",
            body: serviceManifest
        });

        console.log("SERVICE CREATED SUCCESSFULLY:", response.body.metadata.name);
    } catch (error) {
        console.error(
            "SERVICE CREATION FAILED:",
            error.response?.body || error.message
        );

        throw error;
    }
};