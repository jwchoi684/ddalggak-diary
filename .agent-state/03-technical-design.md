# Technical Design — REQ-017

## Context Isolation (highest priority)
`buildChatMessages({persona, diariesText, sessionMessages})` returns `[{role:'system', content: COMMON_BASE + persona.systemPrompt + diariesText}, ...sessionMessages]`. Structurally cannot include other sessions.

## Server Route
`POST /api/chat` accepts `{system: string, messages: ChatMessage[]}`, calls OpenAI Chat Completions with `gpt-4o-mini`, temp 0.7, max_tokens 500. Returns `{content: string}`.
- If `OPENAI_API_KEY` missing → HTTP 500 with Korean error message.
- API key only in outgoing `Authorization` header; never in response.

## Diary Serialization
`serializeDiariesForLLM(entries)` returns lines: `[YYYY-MM-DD] 기분: {label}({emoji}) | 본문: {text}`.

## Cited Diary Detection
`extractCitedDates(responseText, entries)` regex `\d{4}-\d{2}-\d{2}` matches, intersect with entry.date set, return matching ids.

## State Machine
useReducer in `useChatSession`. States: idle, sending, error. Messages array preserved on error; retry resends last user message.

## Session Persistence
- Conversation id generated once via `generateId()`.
- `upsertConversation` called ONLY when user has sent ≥1 message AND on session end (back or 완료).
- `isClosed: true` set on close. 0-message sessions never persisted.

## UI
- Header: ‹ back + persona emoji+label center + "완료" right.
- Suggested chips when no messages.
- User: right-aligned primary; AI: left-aligned gray.
- Cited diary chips below AI responses, tap → editor.
- Error bubble + 다시 시도.

## Korean Strings
- 뒤로 가기, 대화 완료, 메시지 입력, 전송, 답변 작성 중…, 응답을 받지 못했어요, 다시 시도, 아직 일기가 없어요. 먼저 일기를 써보세요, 캘린더로 가기.

## Verdict
PASS
