import cors from "cors";
import express from "express";
import morgan from "morgan";
import { generateActions } from "./services/llmplanner.js";
import { Session } from "./models/Session.js";
import { Prompt } from "./models/Prompt.js";
import { validateActions } from "./services/actionValidator.js";
import { authenticateWithGoogle } from "./services/authService.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import rateLimit from "express-rate-limit";
import {
    createSandbox,
    executeActions,
     getSandboxStatus,
     deleteSandbox
} from "./services/sandboxClient.js";

const app = express();
app.use(
    cors({
        origin: "http://localhost:5173"
    })
);
const aiPlanLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many AI requests. Please try again later."
    },
    keyGenerator: (req) => {
        return req.user?._id?.toString() || req.ip;
    }
});
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/ai/health", (req, res) => {
    res.json({
        status: "ok",
        service: "ai-orchestration"
    });
});

app.post("/api/ai/plan", authMiddleware, aiPlanLimiter, async (req, res) => {
    const { sessionId, prompt } = req.body;

    if (
        !sessionId ||
        typeof sessionId !== "string" ||
        !sessionId.trim()
    ) {
        return res.status(400).json({
            message: "sessionId is required"
        });
    }

    if (sessionId.length > 100) {
        return res.status(400).json({
            message: "sessionId is too long"
        });
    }

    if (
        !prompt ||
        typeof prompt !== "string" ||
        !prompt.trim()
    ) {
        return res.status(400).json({
            message: "prompt is required"
        });
    }

    if (prompt.length > 10000) {
        return res.status(400).json({
            message: "prompt is too long"
        });
    }

    try {
        // Find the session by sessionId first.
        // This lets us distinguish between:
        // 1. Session doesn't exist
        // 2. Session belongs to current user
        // 3. Session belongs to another user
        let session = await Session.findOne({
            sessionId
        });

        // Session exists but belongs to another user
        if (
            session &&
            !session.userId.equals(req.user._id)
        ) {
            return res.status(403).json({
                message: "You do not have access to this session"
            });
        }

        let sandbox;

        if (session) {
            console.log(
                "CHECKING EXISTING SANDBOX:",
                session.sandboxId
            );

            const sandboxStatus = await getSandboxStatus(
                session.sandboxId
            );

            if (sandboxStatus.exists) {
                console.log(
                    "REUSING SANDBOX:",
                    session.sandboxId
                );

                sandbox = {
                    sandboxId: session.sandboxId
                };
            } else {
                console.log(
                    "SANDBOX NOT FOUND, CREATING NEW ONE"
                );

                sandbox = await createSandbox();

                session.sandboxId = sandbox.sandboxId;

                await session.save();
            }
        } else {
            console.log("CREATING NEW SANDBOX");

            sandbox = await createSandbox();

            session = await Session.create({
                sessionId,
                userId: req.user._id,
                sandboxId: sandbox.sandboxId
            });
        }

        const actions = await generateActions(prompt);

        validateActions(actions);

        console.log(
            "GENERATED ACTIONS:",
            actions
        );

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
        console.error(
            "AI ORCHESTRATION FAILED:",
            error
        );

        const validationErrors = [
            "Actions must be an array",
            "At least one action is required",
            "Too many actions",
            "Invalid action",
            "Unsupported action",
            "Invalid file path",
            "requires string content",
            "requires a command",
            "Command cannot be empty",
            "Command contains forbidden operator",
            "Command not allowed"
        ];

        const isValidationError =
            validationErrors.some(
                (message) =>
                    error.message?.includes(message)
            );

        if (isValidationError) {
            return res.status(400).json({
                message: "Invalid AI actions",
                error: error.message
            });
        }

        res.status(500).json({
            message: "AI orchestration failed",
            error: error.message
        });
    }
});

app.get("/api/ai/sessions/:sessionId/history",authMiddleware,async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionId || !sessionId.trim()) {
        return res.status(400).json({
            message: "sessionId is required"
        });
    }
    try {
      const session = await Session.findOne({
         sessionId,
         userId: req.user._id
        });
        if (!session) {
            return res.status(404).json({
                message: "Session not found"
            });
        }

        const history = await Prompt.find({ sessionId })
            .sort({ createdAt: 1 });

        res.json({
            sessionId,
            history
        });
    } catch (error) {
        console.error("HISTORY FETCH FAILED:", error);

        res.status(500).json({
            message: "Failed to fetch session history"
        });
    }
});

app.delete("/api/ai/sessions/:sessionId",authMiddleware, async (req, res) => {
    const { sessionId } = req.params;

    if (!sessionId || !sessionId.trim()) {
        return res.status(400).json({
            message: "sessionId is required"
        });
    }
    try {
        const session = await Session.findOne({
             sessionId,
          userId: req.user._id
          });

        if (!session) {
            return res.status(404).json({
                message: "Session not found"
            });
        }
        try {
            await deleteSandbox(session.sandboxId);
        } catch (error) {
            console.warn(
                `Sandbox deletion skipped for ${session.sandboxId}:`,
                error.message
            );
        }
        await Prompt.deleteMany({ sessionId });
        await Session.deleteOne({ sessionId });
        res.json({
            message: "Session deleted successfully",
            sessionId
        });

    } catch (error) {
        console.error("SESSION DELETE FAILED:", error);

        res.status(500).json({
            message: "Failed to delete session"
        });
    }
});

app.post("/api/auth/google", async (req, res) => {
    const { credential } = req.body;

    if (
        !credential ||
        typeof credential !== "string"
    ) {
        return res.status(400).json({
            message: "Google credential is required"
        });
    }

    try {
        const result = await authenticateWithGoogle(
            credential
        );

        res.json({
            message: "Authentication successful",
            ...result
        });
    } catch (error) {
        console.error("GOOGLE AUTH FAILED:", error);

        res.status(401).json({
            message: "Google authentication failed"
        });
    }
});

app.post(  "/api/auth/logout", authMiddleware,async (req, res) => {
        try {
            await req.authSession.deleteOne();
            res.json({
                message: "Logged out successfully"
            });
        } catch (error) {
            console.error("LOGOUT FAILED:", error);

            res.status(500).json({
                message: "Logout failed"
            });
        }
    }
);

export default app;