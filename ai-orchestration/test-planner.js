import { generatePlan } from "./src/services/llmplanner.js";

const plan = await generatePlan(
    "Create a React App.jsx component that displays Hello ForgeAI"
);

console.log(JSON.stringify(plan, null, 2));