# Technical Design — REQ-015

## Component & Function Signatures

### `formatRelativeTime` — `src/lib/utils/formatRelativeTime.ts`
```ts
export function formatRelativeTime(iso: string, now?: Date): string;
```
Thresholds:
- `<60s` → "방금"
- `<60min` → "{X}분 전"
- `<24h` → "{X}시간 전"
- yesterday (calendar day-1) → "어제"
- `<7 days` → "{X}일 전"
- else → "YYYY.M.D" (no zero-pad)
- Negative diff → "방금"

### `useConversations` — `src/lib/storage/useConversations.ts`
```ts
"use client";
export function useConversations(): { conversations: SearchConversation[]; isReady: boolean };
```
Mirror `useDiaries`.

### `ConversationCard` — `src/app/chat/_components/ConversationCard.tsx`
```ts
export interface ConversationCardProps { conversation: SearchConversation; onTap: () => void; }
```
- `<button>` wrapping `<Card className="p-4">`.
- Top row: emoji + label + "·" + `formatRelativeTime`.
- Body: first user message truncated to 30 chars + "…".
- `aria-label="{personaLabel} 대화 보기, {relativeTime}"`.
- `data-testid="conversation-card-{id}"`.

### `NewChatButton` — `src/app/chat/_components/NewChatButton.tsx`
```ts
export interface NewChatButtonProps { onClick: () => void; }
```
- Full-width pill, bg-paper, p-4, "➕  새 대화 시작".
- `aria-label="새 대화 시작"`, `data-testid="new-chat-button"`.

### `ChatListHeader` — `src/app/chat/_components/ChatListHeader.tsx`
```ts
export interface ChatListHeaderProps { onBack: () => void; }
```
- Sticky top, IconButton back + "대화 기록" title.

### `page.tsx` — `src/app/chat/page.tsx`
```tsx
"use client";
const { conversations, isReady } = useConversations();
const sorted = [...conversations].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
```
- Renders header + new chat button (always) + sorted cards OR empty state.
- Loading: "불러오는 중…" while `!isReady`.

## Visual Spec
- Wrapper: `min-h-screen bg-cream`.
- Header: sticky top, `bg-cream px-4 py-2`, three-column flex.
- Body: `px-4 pt-4 pb-8`, cards `space-y-3`.
- New chat button: bg-paper, 16px radius, shadow-card, full-width, p-4.

## Accessibility
- Header back: `aria-label="뒤로 가기"`.
- Cards: native `<button>` with descriptive aria-label.
- `<time dateTime={iso}>` for relative time.
- Hidden `<h1 className="sr-only">대화 기록</h1>` for landmark navigation.

## Test Hooks
- `data-testid="chat-page"` on wrapper
- `data-testid="new-chat-button"`
- `data-testid="conversation-card-{id}"`
- `data-testid="conversation-list-empty"`

## Test Plan

**`formatRelativeTime.test.ts`** (10 cases):
1. 0s → "방금"
2. 59s → "방금"
3. 60s → "1분 전"
4. 30min → "30분 전"
5. 2h → "2시간 전"
6. Yesterday → "어제"
7. 3d → "3일 전"
8. 8d → "YYYY.M.D"
9. Negative diff → "방금"
10. Explicit `now` param works

**`useConversations.test.ts`** (2 cases):
1. Initial `isReady=false`, `[]`
2. After mount populated from mocked `readConversations`

**`ConversationCard.test.tsx`** (6 cases):
1. Persona emoji + label rendered
2. Relative time rendered via `formatRelativeTime`
3. Truncates long first message with "…"
4. Returns first **user** message (not assistant)
5. Fallback "(빈 대화)" when no user message
6. Click fires `onTap`

**`page.test.tsx`** (6 cases):
1. Empty → empty state + new chat button
2. Sorts by lastMessageAt DESC
3. Single card renders
4. Many cards correct order
5. New chat button → router.push('/chat/new')
6. Card click → router.push('/chat/' + id)

## Korean Strings

| Key | Text |
|---|---|
| Header title | `대화 기록` |
| Back button | `뒤로 가기` |
| New chat button | `➕  새 대화 시작` |
| Empty | `아직 대화가 없어요. AI에게 일기에 대해 물어보세요` |
| Relative time | `방금` / `{n}분 전` / `{n}시간 전` / `어제` / `{n}일 전` / `YYYY.M.D` |
| Loading | `불러오는 중…` |
| Empty msg fallback | `(빈 대화)` |

## Implementation Order
1. `formatRelativeTime.ts` + tests
2. `useConversations.ts`
3. `ChatListHeader.tsx`
4. `NewChatButton.tsx`
5. `ConversationCard.tsx` + tests
6. `page.tsx` + tests

## File Budget

| File | Target |
|---|---|
| `formatRelativeTime.ts` | ~55 |
| `useConversations.ts` | ~25 |
| `ChatListHeader.tsx` | ~30 |
| `NewChatButton.tsx` | ~20 |
| `ConversationCard.tsx` | ~45 |
| `page.tsx` | ~55 |

## Verdict
PASS
