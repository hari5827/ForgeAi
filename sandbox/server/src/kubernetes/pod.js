import { k8sCoreV1Api } from "./config.js";

export async function createPod(sandboxId) {
    const expiresAt = Date.now() + 30 * 60 * 1000;

    const podManifest = {
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                 app: "sandbox",
                 sandboxId,
                 expiresAt: String(expiresAt)
            }
        },

        spec: {
            containers: [
                {
                    name: "sandbox",
                    image: "sandbox-template:v1",
                    imagePullPolicy: "IfNotPresent",

                    resources: {
                        requests: {
                            cpu: "250m",
                            memory: "256Mi"
                        },
                        limits: {
                            cpu: "500m",
                            memory: "512Mi"
                        }
                    },

                    ports: [
                        {
                            containerPort: 5173
                        }
                    ]
                }
            ]
        }
    };

    return k8sCoreV1Api.createNamespacedPod({
        namespace: "default",
        body: podManifest
    });
}