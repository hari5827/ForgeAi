import { KubeConfig, CoreV1Api, Exec } from "@kubernetes/client-node";

const kc = new KubeConfig();

kc.loadFromDefault();

export const k8sCoreV1Api = kc.makeApiClient(CoreV1Api);

export const k8sExec = new Exec(kc);