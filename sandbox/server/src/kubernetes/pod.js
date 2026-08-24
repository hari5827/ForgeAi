import { k8sCoreV1Api } from "./config.js";

export async function createPod(sandboxId, projectId) {

 const podManifest = {
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                sandboxId: sandboxId
            }
        },
        spec: {
            containers: [
                  {

                     image : "template",
                     imagePullPolicy: "IfNotPresent",
                     name: 'sandbox-container',
                     ports: [{ containerPort: 5173}],
                     resources: {
                        limits: {
                        cpu : "500m",
                        memory : "1Gi"},
                     requests: {
                        cpu : "250m",
                        memory : "500Mi" }
                  }
                }
            ]
        }
    };  


  const response = await k8sCoreV1Api.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    })

   return response;
}


