import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        token: {
            type: String,
            required: true,
            unique: true
        },

        expiresAt: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

authSessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

export const AuthSession = mongoose.model(
    "AuthSession",
    authSessionSchema
);