// backend/src/routes/verify.js
import express from "express";
import axios from "axios";
import Doc from "../models/Doc.js";

const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_CX = process.env.GOOGLE_CX || "";

function extractCandidateClaims(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const claims = new Set();
  const candidatePattern =
    /(\$|\d+%?|\b(price|cost|sold|average|retail|typical|commonly|now|rose|fell|dropped)\b)/i;

  for (const line of lines) {
    if (candidatePattern.test(line)) {
      if (line.length > 600) {
        const fragments = line
          .split(/[.;]/)
          .map((f) => f.trim())
          .filter(Boolean);
        for (const frag of fragments) {
          if (candidatePattern.test(frag) && frag.length < 400) claims.add(frag);
        }
      } else {
        claims.add(line);
      }
    }
  }

  if (claims.size === 0) {
    const sentences = text.split(/(?<=[.?!])\s+/);
    for (const s of sentences) if (candidatePattern.test(s)) claims.add(s.trim());
  }

  return Array.from(claims);
}

function parseNumbersFromString(s) {
  const nums = [];

  const dollarPattern = /\$[\d,]+(?:\.\d+)?/g;
  let m;
  while ((m = dollarPattern.exec(s)) !== null) nums.push(m[0].replace(/\$/g, ""));

  const numPattern = /\b\d{1,3}(?:[,\d{3}]+)?(?:\.\d+)?\b/g;
  while ((m = numPattern.exec(s)) !== null) nums.push(m[0]);

  const pctPattern = /\b\d+(?:\.\d+)?%/g;
  while ((m = pctPattern.exec(s)) !== null) nums.push(m[0]);

  return nums
    .map((raw) => {
      const isPct = raw.endsWith("%");
      const cleaned = raw.replace(/[$,%\s]/g, "").replace(/,/g, "");
      const value = Number(cleaned);
      return isNaN(value) ? null : { raw, value, isPct };
    })
    .filter(Boolean);
}

async function googleSearchEvidence(query, maxResults = 5) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    throw new Error("Missing GOOGLE_API_KEY or GOOGLE_CX");
  }

  const url = "https://www.googleapis.com/customsearch/v1";
  try {
    const res = await axios.get(url, {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CX,
        q: query,
        num: maxResults,
      },
      timeout: 10000,
    });

    const items = res.data.items || [];
    return items.map((it) => ({
      title: it.title,
      snippet: it.snippet || "",
      link: it.link || "",
    }));
  } catch (err) {
    return [
      {
        title: "Search failed",
        snippet: err?.toString?.() || String(err),
        link: "",
      },
    ];
  }
}

function deriveVerdictFromEvidence(claim, evidenceSnippets) {
  const claimNums = parseNumbersFromString(claim);
  const evidenceNums = [];

  for (const s of evidenceSnippets) {
    const parsed = parseNumbersFromString(s);
    for (const p of parsed) evidenceNums.push(p.value);
  }

  if (claimNums.length === 0) {
    return {
      verdict: "UNKNOWN",
      reason: "No numeric anchor found",
    };
  }

  if (evidenceNums.length === 0) {
    return {
      verdict: "UNKNOWN",
      reason: "No numeric evidence found",
    };
  }

  const anchor = claimNums[0].value;
  const sorted = evidenceNums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;

  const ratio =
    median === 0
      ? Infinity
      : Math.abs(anchor - median) / Math.max(median, anchor);

  if (ratio > 0.5 && Math.max(anchor, median) >= 100 && Math.min(anchor, median) < 10) {
    return {
      verdict: "MISMATCH",
      reason: `Claim ${anchor} vs median ${median.toFixed(2)} (large gap)`,
    };
  }

  if (median > 0 && Math.abs(anchor - median) / median <= 0.2) {
    return {
      verdict: "MATCH",
      reason: `Close numeric alignment`,
    };
  }

  if (median > 0 && Math.abs(anchor - median) / median <= 0.5) {
    return {
      verdict: "CLOSE",
      reason: `Somewhat close`,
    };
  }

  return {
    verdict: "MISMATCH",
    reason: `Claim ${anchor} vs median ${median.toFixed(2)}`,
  };
}

// ------------------------------------------------------------
// ULTRA-COMPACT HUMAN READABLE FORMAT
// ------------------------------------------------------------
function buildHumanReadableReport(results) {
  const lines = [];

  results.forEach((r, i) => {
    const sourceTitles = Array.isArray(r.evidence)
      ? r.evidence.slice(0, 5).map((e) => e.title || "Untitled").join(", ")
      : "No sources";

    lines.push(
      `${i + 1}. Claim: "${r.claim}"\n` +
        `Verdict: ${r.verdict} | Reason: ${r.reason}\n` +
        `Sources: ${sourceTitles}\n`
    );
  });

  return lines.join("\n");
}

router.post("/", async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: "Missing document ID" });

    const doc = await Doc.findById(id);
    if (!doc) return res.status(404).json({ ok: false, error: "Document not found" });

    const text = doc.text || "";
    const claims = extractCandidateClaims(text);

    if (!claims.length) {
      return res.json({ ok: true, report: "No factual/numeric claims detected." });
    }

    const results = [];

    for (const claim of claims) {
      let searchItems = [];
      try {
        searchItems = await googleSearchEvidence(claim, 5);
      } catch (err) {
        searchItems = [{ title: "Search error", snippet: String(err), link: "" }];
      }

      const snippets = searchItems.map((it) => `${it.title} ${it.snippet}`);
      const { verdict, reason } = deriveVerdictFromEvidence(claim, snippets);

      results.push({
        claim,
        verdict,
        reason,
        evidence: searchItems,
      });
    }

    const report = buildHumanReadableReport(results);

    return res.json({ ok: true, report, results });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
