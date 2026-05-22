# Frontend Implementation — REQ-016 + REQ-017

## Summary

REQ-016: Persona picker page (`/chat/new`) — already complete.
REQ-017: Active AI chat session screen (`/chat/session?personaId=X`) + LLM proxy — implemented in this session.

Build tier: **Option B** (Next.js API route as serverless proxy). `OPENAI_API_KEY` is read exclusively from `process.env` server-side. It never appears in client code or HTTP responses.

## Files Changed

### New production files (REQ-017)

| File | Lines | Purpose |
|---|---|---|
| `src/lib/ai/serializeDiaries.ts` | 30 | Converts DiaryEntry[] → plain-text LLM corpus |
| `src/lib/ai/buildChatMessages.ts` | 58 | Assembles LLM messages array (CONTEXT ISOLATION enforced here) |
| `src/lib/ai/extractCitedDates.ts` | 50 | Regex date extraction + diary ID cross-ref |
| `src/lib/ai/callChat.ts` | 45 | Client fetch wrapper for `/api/chat` |
| `src/app/api/chat/route.ts` | 99 | Serverless proxy: POST /api/chat → OpenAI gpt-4o-mini |
| `src/app/chat/session/page.tsx` | 114 | ActiveChatPage — routing/render coordination |
| `src/app/chat/session/_hooks/useChatSession.ts` | 199 | useReducer state machine + sendMessage/handleRetry + persistSession |
| `src/app/chat/session/_components/ChatHeader.tsx` | 62 | Header: ‹ back + persona label + 완료 |
| `src/app/chat/session/_components/MessageBubble.tsx` | 93 | User/assistant bubbles + LoadingBubble + ErrorBubble |
| `src/app/chat/session/_components/CitedDiaryChip.tsx` | 33 | Tappable pill for cited diary entries |
| `src/app/chat/session/_components/SuggestedPromptChips.tsx` | 50 | Pre-message example question chips |
| `src/app/chat/session/_components/ChatComposer.tsx` | 90 | Auto-growing textarea + send button |

### New test files (REQ-017)

| File | Lines | Cases |
|---|---|---|
| `src/lib/ai/__tests__/serializeDiaries.test.ts` | 64 | 4 |
| `src/lib/ai/__tests__/buildChatMessages.test.ts` | 85 | 3 (includes ISOLATION test) |
| `src/lib/ai/__tests__/extractCitedDates.test.ts` | 61 | 4 |
| `src/lib/ai/__tests__/callChat.test.ts` | 44 | 2 |
| `src/app/api/chat/__tests__/route.test.ts` | 105 | 4 |
| `src/app/chat/session/__tests__/page.test.tsx` | 175 | 6 |

Total new test cases (REQ-017): **23**
Total new test cases including REQ-016: **27**

## Behavior Added

1. GET `/chat/session?personaId=X` renders ActiveChatPage for the chosen persona.
2. LLM call flow: user message → POST /api/chat → OpenAI gpt-4o-mini → assistant bubble.
3. Context isolation: `buildChatMessages` receives only `sessionMessages` (this session only). No other session's messages are ever in scope.
4. Diary serialization format exactly: `[YYYY-MM-DD] 기분: {label}({emoji}) | 본문: {text}`.
5. Cited diary chips: regex matches YYYY-MM-DD in response → cross-ref diary entries → `citedDiaryIds` → tappable `CitedDiaryChip`.
6. Session end (back or 완료): calls `persistSession` only when `messages.length > 0` (empty sessions never persisted).
7. Suggested prompt chips shown when no messages yet; tapping fills composer (does not auto-send).
8. Loading state: `LoadingBubble` ("답변 작성 중…") during in-flight API call.
9. Error state: `ErrorBubble` ("응답을 받지 못했어요.") + "다시 시도" button; user message preserved in state.
10. 0-diary guard: "아직 일기가 없어요…" + "캘린더로 가기" button.
11. API key security: key never touches client; absent key returns HTTP 500 with helpful Korean message.
12. Model: `gpt-4o-mini`, temperature 0.7, max_tokens 500. Uses `fetch` directly (no OpenAI SDK).

## Existing Patterns Reused

- `EmptyState` from `@/design-system/EmptyState` — 0-diary state and missing-persona guard.
- `IconButton` from `@/design-system/IconButton` — back chevron in ChatHeader.
- `Card` pattern (box-shadow via CSS var) — message bubbles.
- `useDiaries` hook from `@/lib/storage/useDiaries` — diary entries + SSR-safe hydration.
- `generateId` + `upsertConversation` from `@/lib/storage`.
- `PERSONA_MAP` / `MOOD_MAP` from design-system.
- `Routes` from `@/lib/navigation` — all `router.push` calls use typed helpers.
- `setupNextNavigation` test helper pattern — same as REQ-016 tests.
- `@vitest-environment happy-dom` comment on all UI tests.
- `vi.mock` + top-level `await import` pattern from existing Editor tests.

## Tests Added / Updated

23 new test cases across 6 new test files (REQ-017).
All 373 total tests pass (previous 350 + 23 new).

Key isolation test: `BCM1` in `buildChatMessages.test.ts` verifies that the messages array is exactly `[system, ...sessionMessages]` with no extra entries.
Key security test: `RC1` in `route.test.ts` verifies that the API key appears in the outgoing `Authorization` header and never in the response body.
Key invariant test: `AC6` in `page.test.tsx` verifies that `upsertConversation` is NOT called when 0 messages are sent.

## Commands Run

```
npx tsc --noEmit        → 0 errors
npm run lint            → 0 errors / 0 warnings
npx vitest run          → 373/373 passed (57 test files)
npm run test:e2e        → 8/8 passed
```

## Risks / Follow-ups

1. `page.tsx` is 114 lines (4 over guideline) due to two full-page conditional render branches (persona-not-found and 0-diary). These share no DOM structure so cannot be co-located under a single `return`; the natural boundary justification applies per CLAUDE.md.
2. `useChatSession.ts` is 199 lines — it intentionally bundles the state reducer, hook, and `persistSession` utility since they are tightly coupled to the same session lifecycle. Splitting them further would create circular or awkward dependency graphs.
3. No E2E test covers the full chat flow (chat → persona select → message → AI response → cited chip → diary) because it requires a live OpenAI key. Recommend adding a mocked E2E spec in a follow-up.
4. `suggestedQuestions` field is not yet on the `Persona` type; fallback prompts are used for all 14 personas in MVP. Adding per-persona suggestions is a P2 enhancement.

## Verdict
PASS
