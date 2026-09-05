import mongoose from "mongoose";

const promptSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            index: true
        },

        prompt: {
            type: String,
            required: true
        },

        actions: {
            type: Array,
            required: true
        },

        result: {
            type: Object,
            required: true
        }
    },
    {
        timestamps: true
    }
);

export const Prompt = mongoose.model("Prompt", promptSchema);