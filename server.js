import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

import uploadRoute from "./src/routes/upload.js";
import askRoute from "./src/routes/ask.js";
import verifyRoute from "./src/routes/verify.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("❌ Missing MONGO_URI in environment variables");
  process.exit(1);
}

mongoose
  .connect(mongoURI, { dbName: "synapse" })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

// Routes
app.use("/api/upload", uploadRoute);
app.use("/api/ask", askRoute);
app.use("/api/verify", verifyRoute);

// Basic Health Check
app.get("/", (req, res) => {
  res.json({
    status: "Synapse backend running",
    uptime: process.uptime(),
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
