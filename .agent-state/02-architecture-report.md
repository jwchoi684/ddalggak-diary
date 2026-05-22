# Architecture Report — REQ-015

## Summary

REQ-015 is a low-risk display-only chat list screen. All primitives (`Card`, `EmptyState`, `IconButton`, `PERSONAS`) exist. Storage layer has `readConversations` but no `useConversations` hook — must be added (mirror `useDiaries.ts`). Type is `SearchConversation` (not `Conversation`). PRD's "YYYY.M.D" uses no zero-padding — different from existing `formatListDate.ts`. New `formatRelativeTime` utility needed.

## Key Findings

1. **`SearchConversation` shape** (`src/lib/storage/types.ts:141-160`): `id, personaId, messages, lastMessageAt, isClosed, title`. Use `messages.find(m => m.role === 'user')?.content` instead of `title` (which may not yet be set by REQ-017).
2. **No `useConversations` hook exists.** Mirror `useDiaries.ts` SSR-safe pattern. New file: `src/lib/storage/useConversations.ts`.
3. **`getPersona(id)`** lives in `@/design-system/personas` (not in storage barrel). `PERSONA_MAP[id]` for O(1) lookup.
4. **`Routes.chat = '/chat'`** exists. No `Routes.conversation(id)` or `Routes.chatNew` — hardcode `/chat/${id}` and `/chat/new` for now.
5. **`stats/page.tsx`** (48 lines, no Suspense) is closer template than `list/page.tsx`. REQ-015 has no URL params.
6. **PRD "YYYY.M.D"** is non-zero-padded ("2026.5.12"). `formatListDate` returns "YYYY.MM.DD" — different. Need new util.

## Integration Points

| Concern | Source | Notes |
|---|---|---|
| Conversation data | `useConversations()` (NEW) | Mirror `useDiaries` |
| Persona lookup | `getPersona(id)` from `@/design-system/personas` | |
| Card surface | `Card` from `@/design-system` | `p-4` |
| Empty state | `EmptyState` from `@/design-system` | |
| Header back | `IconButton` + inline ChevronLeft | Copy from ListHeader |
| Routing | `useRouter()`, `Routes.chat` | Hardcode `/chat/new`, `/chat/${id}` |
| Relative time | `formatRelativeTime` (NEW) | `src/lib/utils/` |

## File Budget

| File | Est. lines |
|---|---|
| `src/app/chat/page.tsx` | ~55 |
| `src/app/chat/_components/ConversationCard.tsx` | ~45 |
| `src/app/chat/_components/NewChatButton.tsx` | ~20 |
| `src/app/chat/_components/ChatListHeader.tsx` | ~30 |
| `src/lib/utils/formatRelativeTime.ts` | ~55 |
| `src/lib/storage/useConversations.ts` | ~25 |

All under 100.

## Suggested File Structure

```
src/
  app/chat/
    page.tsx                              # NEW — replaces stub
    _components/
      ConversationCard.tsx                # NEW
      NewChatButton.tsx                   # NEW
      ChatListHeader.tsx                  # NEW
    __tests__/
      page.test.tsx                       # NEW
    _components/__tests__/
      ConversationCard.test.tsx           # NEW
  lib/
    storage/
      useConversations.ts                 # NEW
    utils/
      formatRelativeTime.ts               # NEW
      __tests__/
        formatRelativeTime.test.ts        # NEW
```

## Architectural Risks

- **`SearchConversation` naming drift**: keep storage type name; UI uses `ConversationCard` colloquially.
- **First message vs stored `title`**: bypass `title` (not yet wired by REQ-017); compute from messages directly.
- **Placeholder `/chat/new`**: 404 until REQ-016 lands. Documented in implementation report.

## Verdict
PASS
