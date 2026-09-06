import crypto from "crypto";
import { User } from "../models/User.js";
import { AuthSession } from "../models/AuthSession.js";
import { verifyGoogleToken } from "./googleAuth.js";

const SESSION_DURATION = 2 * 24 * 60 * 60 * 1000;

export async function authenticateWithGoogle(googleToken) {
    const googleUser = await verifyGoogleToken(googleToken);

    let user = await User.findOne({
        googleId: googleUser.googleId
    });

    if (!user) {
        user = await User.create({
            googleId: googleUser.googleId,
            email: googleUser.email,
            name: googleUser.name,
            avatar: googleUser.avatar
        });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date(
        Date.now() + SESSION_DURATION
    );

    await AuthSession.create({
        userId: user._id,
        token,
        expiresAt
    });

    return {
        token,
        expiresAt,
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar
        }
    };
}