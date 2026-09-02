import { KubeConfig, Exec } from "@kubernetes/client-node";

const kc = new KubeConfig();
kc.loadFromDefault();

const exec = new Exec(kc);

const podName = "sandbox-pod-01a05d8c-37ec-7152-b557-fb8feda48c6f";

const stdout = {
    write: (data) => console.log("STDOUT:", data)
};

const stderr = {
    write: (data) => console.log("STDERR:", data)
};

console.log("Starting exec...");

exec.exec(
    "default",
    podName,
    "sandbox",
    ["sh", "-c", "echo hello-from-node"],
    stdout,
    stderr,
    null,
    false,
    (status) => {
        console.log("STATUS:", status);
    }
);