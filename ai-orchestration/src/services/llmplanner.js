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

        throw new Error(
            "Invalid action format from Gemini"
        );
    });
}

export async function generateActions(
    prompt,
    projectContext = {}
) {
    const files = Array.isArray(projectContext.files)
        ? projectContext.files
        : [];

    const fileTree =
        files.length > 0
            ? files.join("\n")
            : "(No project files available)";

    const importantFiles =
        projectContext.importantFiles || {};

    const importantFileContext =
        Object.entries(importantFiles)
            .map(
                ([path, content]) =>
                    `\n--- ${path} ---\n${content}`
            )
            .join("\n");

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",

        contents: `
You are an AI coding planner operating inside an existing software project.

Your job is to convert the user's request into executable sandbox actions.

You are NOT starting from an empty project unless the project context explicitly shows an empty project.

PROJECT STRUCTURE:
${fileTree}

IMPORTANT EXISTING FILES:
${importantFileContext || "(None provided)"}

--------------------------------------------------
ALLOWED ACTIONS
--------------------------------------------------

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

--------------------------------------------------
PROJECT-AWARE RULES
--------------------------------------------------

1. FIRST reason about the existing project structure.

2. If the requested feature can be implemented by modifying an
   existing file, prefer update_file instead of create_file.

3. For React/Vite projects, prefer the existing React entry files
   such as:
   - src/App.jsx
   - src/main.jsx
   - src/App.js
   - src/main.js

4. Reuse existing CSS files when appropriate instead of creating
   unrelated HTML pages.

5. Do NOT create a separate .html page for a feature that belongs
   inside the existing React application.

6. If an existing component already handles the requested feature,
   update that component instead of creating a duplicate.

7. Only create a new file when:
   - the feature genuinely needs a new module/component/file, OR
   - no suitable existing file exists.

8. Preserve the existing project's framework and structure.

9. Do not replace the entire project with a different framework.

10. Use the project context as the source of truth for file paths.

11. Never invent existing files that are not present in the project
    context.

12. File paths must be relative.

13. Do not use absolute paths.

--------------------------------------------------
OUTPUT RULES
--------------------------------------------------

- Return ONLY valid JSON.
- Return an object with an "actions" array.
- Every action MUST have an "action" field.
- Never use nested formats such as:
  {"update_file": {...}}
- Do not use markdown.
- Do not add explanations.

Example:

{
  "actions": [
    {
      "action": "update_file",
      "path": "src/App.jsx",
      "content": "..."
    }
  ]
}

--------------------------------------------------
USER REQUEST
--------------------------------------------------

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
        throw new Error(
            "Gemini response does not contain actions array"
        );
    }

    return normalizeActions(parsed.actions);
}