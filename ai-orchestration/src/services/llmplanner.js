import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function normalizeActions(actions) {
    return actions.map((item) => {
        if (item.action) {
            return item;
        }
        if (item.create_file) {
            return {
                action: "create_file",
                path: item.create_file.path,
                content: item.create_file.content
            };
        }

        if (item.update_file) {
            return {
                action: "update_file",
                path: item.update_file.path,
                content: item.update_file.content
            };
        }

        if (item.delete_file) {
            return {
                action: "delete_file",
                path: item.delete_file
            };
        }

        if (item.run_command) {
            return {
                action: "run_command",
                command: item.run_command
            };
        }

        throw new Error("Invalid action format from Gemini");
    });
}

export async function generateActions(prompt) {
    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `
You are an AI coding planner.

Convert the user's request into executable sandbox actions.

Allowed actions:

create_file:
{
  "action": "create_file",
  "path": "relative/path",
  "content": "file content"
}

update_file:
{
  "action": "update_file",
  "path": "relative/path",
  "content": "file content"
}

delete_file:
{
  "action": "delete_file",
  "path": "relative/path"
}

run_command:
{
  "action": "run_command",
  "command": "shell command"
}

IMPORTANT:
- Return ONLY valid JSON.
- Return an object with an "actions" array.
- Every action MUST have an "action" field.
- Never use nested formats like {"update_file": {...}}.
- File paths must be relative.
- Do not use markdown.
- Do not add explanations.

Example:
{
  "actions": [
    {
      "action": "create_file",
      "path": "test.txt",
      "content": "Hello"
    }
  ]
}

User request:
${prompt}
        `,
        config: {
            temperature: 0,
            responseMimeType: "application/json"
        }
    });

    const text = response.text.trim();

    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed.actions)) {
        throw new Error("Gemini response does not contain actions array");
    }

    return parsed.actions;
}