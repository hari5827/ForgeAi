import "dotenv/config";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

const PORT = 4000;

await connectDB();

app.listen(PORT, () => {
    console.log(`AI orchestration server running on port ${PORT}`);
});