import express from "express";
import morgan from "morgan";

import {
    createSandbox,
    executeActions
} from "./services/sandboxClient.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));

app.get("/api/ai/health", (req, res) => {
    res.json({
        status: "ok",
        service: "ai-orchestration"
    });
});

app.post("/api/ai/plan", async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({
            message: "Prompt is required"
        });
    }

    try {
        const sandbox = await createSandbox();

        const actions = [
            {
                action: "create_file",
                path: "src/App.jsx",
                content: "// generated code will go here"
            }
        ];

        const result = await executeActions(
            sandbox.sandboxId,
            actions
        );

        res.json({
            message: "AI orchestration completed",
            prompt,
            sandbox,
            result
        });

    } catch (error) {
        console.error("AI ORCHESTRATION FAILED:", error);

        res.status(500).json({
            message: "AI orchestration failed",
            error: error.message
        });
    }
});

export default app;