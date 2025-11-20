import express from "express";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import multer from "multer";
import pdfParse from "pdf-parse";
import Doc from "../models/Doc.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.json({ ok: false, error: "No file" });

    const pdfText = await pdfParse(req.file.buffer);

    const doc = await Doc.create({
      name: req.file.originalname,
      text: pdfText.text,
    });

    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

export default router;
