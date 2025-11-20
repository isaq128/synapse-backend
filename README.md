# Synapse Backend (ready-to-run)

This package is prepared to match your frontend. It uses the installed `@tavily/core` style (`tavily({...})`) and `groq-sdk` for LLM calls.

## How to run (on your machine)

1. Extract the zip and `cd` into the folder.
2. Verify `.env` is present and correct.
3. Run `npm install` (may take a while).
4. Start with `npm start`.

Notes:
- The Groq model is configurable with `GROQ_MODEL` in `.env`. Default set to `llama-3.1-mini` which is typically available; change if your Groq account requires a different model.
- Tavily usage uses the `tavily({ apiKey })` import (v0.5.13). If you upgrade Tavily sdk later, you may change imports accordingly.
- Upload endpoint: POST /api/upload (form key `file`)
- Ask endpoint: POST /api/ask  with JSON `{ id, question, mode }`
- Verify endpoint: POST /api/verify with JSON `{ id }`

