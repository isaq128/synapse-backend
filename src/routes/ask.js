import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import Groq from "groq-sdk";
import Doc from "../models/Doc.js";

const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function buildPrompt(mode, question, text) {
  return `
You are Synapse, an AI that ALWAYS gives medium-length answers (6–10 sentences).

Mode: ${mode}
Question: "${question}"

Document:
"""
${text}
"""

Answer clearly, factual, and medium-length only.
    `;
}

router.post("/", async (req, res) => {
  try {
    const { id, question, mode } = req.body;

    const doc = await Doc.findById(id);
    if (!doc) return res.json({ ok: false, error: "Not found" });

    const finalPrompt = buildPrompt(mode || "summary", question, doc.text);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2,
      max_tokens: 400,
    });

    return res.json({
      ok: true,
      answer: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error("ASK ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

export default router;
