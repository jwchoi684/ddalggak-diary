# Requirement Intake — REQ-017

## Restatement
Active AI chat session with strict context isolation. Each session sends ONLY [system + diary corpus + this session's messages] to LLM. Persona locked at start. Empty sessions not persisted.

## Build Tier
Option B (serverless proxy via Next.js API route at `/api/chat`). `OPENAI_API_KEY` server-side env var only.

## Invariants
1. Context isolation: messages array sent to OpenAI = [system, ...sessionMessages]. ZERO other sessions.
2. Diary serialization: `[YYYY-MM-DD] 기분: label(emoji) | 본문: text` joined by \n.
3. Model: gpt-4o-mini, temp 0.7, max_tokens 500.
4. Cited diaries via regex YYYY-MM-DD cross-ref.
5. Empty conversation (0 messages) NOT persisted.
6. API key NEVER in client/response.
7. 0-diary state: friendly empty state + calendar CTA.
8. Korean strings: header, completion button, error/retry.

## Dependencies
REQ-002, REQ-004, REQ-009, REQ-015, REQ-016 — all DONE.

## Verdict
PASS
