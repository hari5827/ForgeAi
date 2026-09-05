import express from "express";
import morgan from "morgan";
import { generateActions } from "./services/llmplanner.js";
import { Session } from "./models/Session.js";
import { Prompt } from "./models/Prompt.js";

import {
    createSandbox,
    executeActions,
     getSandboxStatus
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
    const { sessionId, prompt } = req.body;

    if (!sessionId || !prompt) {
        return res.status(400).json({
            message: "sessionId and prompt are required"
        });
    }
 
    try {
        let session = await Session.findOne({ sessionId });

           let sandbox;

          if (session) {
      console.log("CHECKING EXISTING SANDBOX:", session.sandboxId);
      const sandboxStatus = await getSandboxStatus(session.sandboxId);

     if (sandboxStatus.exists) {
        console.log("REUSING SANDBOX:", session.sandboxId);

        sandbox = {
            sandboxId: session.sandboxId
        };
    } else {
        console.log("SANDBOX NOT FOUND, CREATING NEW ONE");

        sandbox = await createSandbox();

        session.sandboxId = sandbox.sandboxId;
        await session.save();
    }
} else {
    console.log("CREATING NEW SANDBOX");

    sandbox = await createSandbox();

    session = await Session.create({
        sessionId,
        sandboxId: sandbox.sandboxId
    });
}

        const actions = await generateActions(prompt);

        console.log("GENERATED ACTIONS:", actions);

        const result = await executeActions(
            sandbox.sandboxId,
            actions
        );

        await Prompt.create({
            sessionId,
            prompt,
            actions,
            result
        });

        res.json({
            message: "AI orchestration completed",
            sessionId,
            sandbox,
            prompt,
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

app.get("/api/ai/sessions/:sessionId/history", async (req, res) => {
    const { sessionId } = req.params;

    try {
        const history = await Prompt.find({ sessionId })
            .sort({ createdAt: 1 });

        res.json({
            sessionId,
            history
        });

    } catch (error) {
        console.error("HISTORY FETCH FAILED:", error);

        res.status(500).json({
            message: "Failed to fetch session history",
            error: error.message
        });
    }
});

export default app;