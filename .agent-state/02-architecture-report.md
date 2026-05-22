# Architecture Report — REQ-017

## Decision: Option B (Serverless Proxy)

Use Next.js Route Handler at `src/app/api/chat/route.ts` (POST). Server reads `process.env.OPENAI_API_KEY`. Client never sees the key.

## File Structure
- `src/lib/ai/serializeDiaries.ts`
- `src/lib/ai/buildChatMessages.ts` — isolation enforced here
- `src/lib/ai/extractCitedDates.ts`
- `src/lib/ai/callChat.ts` — client fetch
- `src/app/api/chat/route.ts` — server proxy
- `src/app/chat/session/page.tsx`
- `src/app/chat/session/_hooks/useChatSession.ts` — state machine
- `src/app/chat/session/_components/{ChatHeader,MessageBubble,CitedDiaryChip,SuggestedPromptChips,ChatComposer}.tsx`

## Integration Points
- `useDiaries`, `upsertConversation`, `generateId` from `@/lib/storage`
- `PERSONA_MAP` from `@/design-system/personas`
- Routes from `@/lib/navigation`

## Verdict
PASS
