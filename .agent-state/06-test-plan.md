# Test Plan — REQ-017

23 new cases across 6 test files:
- `serializeDiaries.test.ts` (4): exact format, empty, multiple sorted, special chars
- `buildChatMessages.test.ts` (3): BCM1 ISOLATION, BCM2 system prompt content, BCM3 user/assistant interleaving
- `extractCitedDates.test.ts` (4): single match, no dates, dates not in diary set, multiple
- `callChat.test.ts` (2): ok / error
- `route.test.ts` (4): RC1 API key in header only, missing key 500, missing body 400, OpenAI error
- `page.test.tsx` (6): includes AC6 (0-message session not persisted), header renders, retry on error, 0-diary state, send happy path, cited chip displayed

## Verdict
PASS
