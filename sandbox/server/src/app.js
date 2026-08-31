import express from "express";
import morgan from "morgan";
import { v7 as uuid } from "uuid";

import { createPod } from "./kubernetes/pod.js";
import { createService } from "./kubernetes/service.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));

app.get("/api/sandbox/health", (req, res) => {
    res.json({
        message: "Sandbox API is healthy",
        status: "ok"
    });
});

app.post("/api/sandbox/start", async (req, res) => {
    const sandboxId = uuid();

    try {
        await createPod(sandboxId);
        await createService(sandboxId);

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

export default app;