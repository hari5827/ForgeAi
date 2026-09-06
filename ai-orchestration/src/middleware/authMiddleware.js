import { AuthSession } from "../models/AuthSession.js";
import { User } from "../models/User.js";

export async function authMiddleware(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const token = authorization.substring(7);

        const session = await AuthSession.findOne({
            token,
            expiresAt: {
                $gt: new Date()
            }
        });

        if (!session) {
            return res.status(401).json({
                message: "Session expired or invalid"
            });
        }

        const user = await User.findById(session.userId);

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        req.user = user;
        req.authSession = session;

        next();
    } catch (error) {
        console.error("AUTH MIDDLEWARE FAILED:", error);

        res.status(500).json({
            message: "Authentication failed"
        });
    }
}