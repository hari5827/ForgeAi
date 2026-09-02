import { KubeConfig, CoreV1Api } from "@kubernetes/client-node";

const kc = new KubeConfig();

kc.loadFromDefault();

export const k8sCoreV1Api = kc.makeApiClient(CoreV1Api);