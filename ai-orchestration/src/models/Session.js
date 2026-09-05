import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true
        },

        sandboxId: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

export const Session = mongoose.model("Session", sessionSchema);