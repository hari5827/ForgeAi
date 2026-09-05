import express from "express";
import morgan from "morgan";
import { v7 as uuid } from "uuid";
import { k8sCoreV1Api } from "./kubernetes/config.js";
import { cleanupExpiredSandboxes } from "./kubernetes/cleanup.js";
import { createPod } from "./kubernetes/pod.js";
import { deleteSandbox } from "./kubernetes/delete.js";
import { createService } from "./kubernetes/service.js";
import { executeAction } from "./service/sandboxExecutor.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));

app.get("/api/sandbox/health", (req, res) => {
    res.json({
        message: "Sandbox API is healthy",
        status: "ok"
    });
});

async function waitForPodReady(sandboxId) {
    const podName = `sandbox-pod-${sandboxId}`;

    for (let i = 0; i < 30; i++) {
        try {
            const pod = await k8sCoreV1Api.readNamespacedPod({
                name: podName,
                namespace: "default"
            });

            const phase = pod.status?.phase;
            const nodeName = pod.spec?.nodeName;

            if (phase === "Running" && nodeName) {
                return;
            }
        } catch (error) {
            // Pod may not exist yet
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error("Sandbox pod did not become ready");
}



app.post("/api/sandbox/start", async (req, res) => {
    const sandboxId = uuid();

    try {
        await createPod(sandboxId);
        await createService(sandboxId);

        await waitForPodReady(sandboxId);

        res.status(201).json({
            message: "Sandbox created successfully",
            sandboxId,
            previewUrl: `http://${sandboxId}.localhost:8080`
        });

    } catch (error) {
        console.error("SANDBOX CREATION FAILED:", error);

        res.status(500).json({
            message: "Failed to create sandbox",
            error: error.message
        });
    }
});
app.get("/api/sandbox/:sandboxId/status", async (req, res) => {
    const { sandboxId } = req.params;

    try {
        const pod = await k8sCoreV1Api.readNamespacedPod({
            name: `sandbox-pod-${sandboxId}`,
            namespace: "default"
        });

        const phase = pod.status?.phase || "Unknown";

        res.json({
            sandboxId,
            status: phase.toLowerCase()
        });
    } catch (error) {
        console.error(
            "STATUS CHECK FAILED:",
            JSON.stringify(error, Object.getOwnPropertyNames(error))
        );

        const statusCode =
            error.response?.statusCode ||
            error.statusCode ||
            error.code;

        if (Number(statusCode) === 404) {
            return res.status(404).json({
                sandboxId,
                status: "not_found"
            });
        }

        res.status(500).json({
            message: "Failed to check sandbox status",
            error: error.message
        });
    }
});

app.delete("/api/sandbox/:sandboxId", async (req, res) => {
    const { sandboxId } = req.params;

    try {
        await deleteSandbox(sandboxId);

        res.json({
            message: "Sandbox deleted successfully",
            sandboxId
        });
    } catch (error) {
        console.error("SANDBOX DELETE FAILED:", error);

        res.status(500).json({
            message: "Failed to delete sandbox",
            error: error.message
        });
    }
});

app.post("/api/sandbox/:sandboxId/execute", async (req, res) => {
    const { sandboxId } = req.params;
    const { actions } = req.body;

    if (!Array.isArray(actions)) {
        return res.status(400).json({
            message: "actions must be an array"
        });
    }

    try {
        const results = [];

        for (const action of actions) {
            const result = await executeAction(
                sandboxId,
                action
            );

            results.push(result);
        }

        res.json({
            sandboxId,
            message: "Actions executed successfully",
            results
        });

    } catch (error) {
        console.error("SANDBOX EXECUTION FAILED:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

        res.status(500).json({
            message: "Failed to execute actions",
            error: error.message
        });
    }
});
setInterval(() => {
    cleanupExpiredSandboxes().catch((error) => {
        console.error("CLEANUP FAILED:", error.message);
    });
}, 60 * 1000);

export default app;