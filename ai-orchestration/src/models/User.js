import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        googleId: {
            type: String,
            required: true,
            unique: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        name: {
            type: String,
            required: true
        },

        avatar: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

export const User = mongoose.model("User", userSchema);