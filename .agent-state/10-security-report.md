# Security Review — REQ-017

## High-Risk Surface
- LLM API call via OpenAI Chat Completions
- API key handling
- User text shipped to third party

## Findings

### Critical/High
None.

### Medium
**M-1 — User diary content sent to OpenAI (third party).**
Diary entries (potentially PII) are serialized into the system prompt and sent to OpenAI. This is unavoidable for the AI feature and is the user's choice when invoking it. Mitigation: README/settings should warn users that content leaves the device. Out of scope to add a warning UI in this REQ; flag for v2.

### Low
**L-1 — `OPENAI_API_KEY` in `.env.local`**. Standard practice. `.env.local` already in `.gitignore`. Never logged.
**L-2 — Cited diary regex** matches any YYYY-MM-DD that *coincidentally* matches a date — not a security issue but a correctness one (UX).

## Verified Properties
- API key NEVER in client code (verified: callChat only fetches `/api/chat`).
- API key NEVER in HTTP response (verified by RC1 test).
- No `dangerouslySetInnerHTML` anywhere new.
- No eval, no new Function in production paths.
- Server route validates request body before reading key.
- Korean error messages don't leak stack traces or internal details.

## Verdict
PASS
