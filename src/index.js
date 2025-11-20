import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🚀 FORCE LOAD backend/.env EXACTLY FROM DISK (no guessing)
dotenv.config({
  path: path.join(__dirname, "..", ".env"),
});

console.log("========== ENV CHECK ==========");
console.log("GOOGLE_API_KEY =", process.env.GOOGLE_API_KEY);
console.log("GOOGLE_CX =", process.env.GOOGLE_CX);
console.log("================================");

import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import uploadRouter from "./routes/upload.js";
import askRouter from "./routes/ask.js";
import verifyRouter from "./routes/verify.js";

const app = express();
app.use(cors());
app.use(express.json());

// Connect Mongo
mongoose.connect(process.env.MONGO_URI, { dbName: "synapseAI" })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

app.use("/api/upload", uploadRouter);
app.use("/api/ask", askRouter);
app.use("/api/verify", verifyRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Backend running on", PORT));
