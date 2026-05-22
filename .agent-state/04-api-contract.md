# API Contract — REQ-015

## Summary

Internal client-side TypeScript interfaces. No HTTP, no new storage keys.

## Interfaces

### `formatRelativeTime(iso: string, now?: Date): string`
Returns Korean relative time per thresholds (방금/X분 전/X시간 전/어제/X일 전/YYYY.M.D).

### `useConversations(): { conversations: SearchConversation[]; isReady: boolean }`
SSR-safe hook mirroring `useDiaries`. Read-only.

### `ConversationCard` props
```ts
{ conversation: SearchConversation; onTap: () => void; }
```

### `NewChatButton` props
```ts
{ onClick: () => void; }
```

### `ChatListHeader` props
```ts
{ onBack: () => void; }
```

## Storage Reads
- `readConversations()` (read-only, no new keys).

## Routing
- `Routes.chat = '/chat'`.
- Card tap → `/chat/${id}` (hardcoded; REQ-018 will own route).
- New chat → `/chat/new` (hardcoded; REQ-016 will own route).

## Korean Strings
| Key | Text |
|---|---|
| Header title | `대화 기록` |
| Back | `뒤로 가기` |
| New chat | `➕  새 대화 시작` |
| Empty | `아직 대화가 없어요. AI에게 일기에 대해 물어보세요` |
| Loading | `불러오는 중…` |
| Empty msg fallback | `(빈 대화)` |

## Caller Invariants
1. `useConversations` called inside `"use client"`.
2. Card tap uses `router.push('/chat/' + id)`.
3. New chat button uses `router.push('/chat/new')`.
4. `getPersona` from `@/design-system/personas`.
5. Sort: ISO 8601 `localeCompare` DESC.
6. First user message extraction (not stored `title`).

## Backward Compatibility
- `Routes.chat` unchanged.
- Stub at `/chat` replaced.
- No localStorage schema change.

## Verdict
PASS
