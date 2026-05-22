# API Contract — REQ-017

## HTTP API
### POST /api/chat
Request:
```json
{ "system": "string", "messages": [{"role":"user|assistant","content":"string"}] }
```
Response 200:
```json
{ "content": "string" }
```
Errors:
- 400 missing body
- 500 missing OPENAI_API_KEY or OpenAI error

## Internal Interfaces
- `serializeDiariesForLLM(entries: DiaryEntry[]): string`
- `buildChatMessages({persona, diariesText, sessionMessages}): ChatMessageForLLM[]`
- `extractCitedDates(text: string, entries: DiaryEntry[]): string[]` (returns entry ids)
- `callChat({system, messages}): Promise<{content: string}>`

## Storage
- Writes `SearchConversation` to `ddalkkak:conversations:v1` via `upsertConversation` ONLY when messages.length > 0.

## Korean Strings
See design.

## Caller Invariants
1. `buildChatMessages` receives ONLY `sessionMessages` from this session.
2. `callChat` calls `/api/chat`, NEVER OpenAI directly.
3. Server reads `process.env.OPENAI_API_KEY`, response never includes key.
4. Empty session → no persistence.

## Verdict
PASS
