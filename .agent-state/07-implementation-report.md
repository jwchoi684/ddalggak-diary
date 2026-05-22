# Frontend Implementation — REQ-015: AI 채팅 대화 리스트

## Summary

REQ-015 implements the AI chat conversation list screen at `/chat` (was a 8-line stub). The screen shows a sorted list of past AI chat sessions with sticky header, a "새 대화 시작" pill button, conversation cards (persona + relative time + first user message preview), loading state, and empty state. All 24 planned test cases pass; total test suite: 50 files, 346 tests, 0 failures.

---

## Files Changed

| File | Action | Lines | Notes |
|---|---|---|---|
| `src/lib/utils/formatRelativeTime.ts` | NEW | 78 | Korean relative-time formatter (방금/X분 전/X시간 전/어제/X일 전/YYYY.M.D) |
| `src/lib/utils/__tests__/formatRelativeTime.test.ts` | NEW | 68 | 10 test cases (FRT1–FRT10) |
| `src/lib/storage/useConversations.ts` | NEW | 31 | SSR-safe hook mirroring `useDiaries` |
| `src/lib/storage/__tests__/useConversations.test.ts` | NEW | 47 | 2 test cases (UC1–UC2) |
| `src/app/chat/_components/ChatListHeader.tsx` | NEW | 47 | Sticky header with `IconButton` back + centered title |
| `src/app/chat/_components/NewChatButton.tsx` | NEW | 29 | Full-width pill button |
| `src/app/chat/_components/ConversationCard.tsx` | NEW | 60 | Card button: persona + time + preview |
| `src/app/chat/_components/__tests__/ConversationCard.test.tsx` | NEW | 101 | 6 test cases (CC1–CC6) |
| `src/app/chat/page.tsx` | REPLACED | 54 | Was 8-line stub; now full "use client" page |
| `src/app/chat/__tests__/page.test.tsx` | NEW | 186 | 6 test cases (CL1–CL6) |

---

## Behavior Added

- **`formatRelativeTime(iso, now?)`** — converts ISO 8601 timestamp to Korean relative time. Thresholds: negative diff → "방금"; < 60s → "방금"; < 60min → "X분 전"; < 24h → "X시간 전"; yesterday (calendar day) → "어제"; < 7 calendar days → "X일 전"; else → "YYYY.M.D" (no zero-padding). Optional `now` param for deterministic testing.
- **`useConversations()`** — SSR-safe hook. Returns `{ conversations: SearchConversation[]; isReady: boolean }`. Reads localStorage via `readConversations()` once on mount. `isReady: false` on initial hydration render to prevent mismatch.
- **`ChatListHeader`** — sticky `<header>` with `bg-cream px-4 py-2`. `IconButton` (back, aria-label "뒤로 가기") + centered "대화 기록" text. Hidden `<h1 className="sr-only">대화 기록</h1>` for landmark navigation.
- **`NewChatButton`** — full-width pill, `bg-paper`, `data-testid="new-chat-button"`, aria-label "새 대화 시작". Label text "➕  새 대화 시작". Always rendered above the list.
- **`ConversationCard`** — native `<button>` wrapping `<Card className="p-4">`. Top row: persona emoji + label + "·" + `<time dateTime={iso}>{relativeTime}</time>`. Body: first user message truncated to 30 chars + "…", or "(빈 대화)" when no user messages. `data-testid="conversation-card-{id}"`. aria-label: "{personaLabel} 대화 보기, {relativeTime}".
- **`ChatPage`** — `"use client"` page. Renders `ChatListHeader` (onBack → `router.back()`) + `NewChatButton` (onClick → `router.push('/chat/new')`) + sorted conversation cards (`lastMessageAt` DESC) or empty/loading state. `data-testid="chat-page"` on wrapper.

---

## Existing Patterns Reused

- `Card` from `@/design-system/Card` — same `<Card className="p-4">` usage as `DiaryListCard`.
- `IconButton` from `@/design-system/IconButton` — same inline SVG + label pattern as `ListHeader`.
- `getPersona` from `@/design-system/personas` — O(1) lookup for emoji + label.
- `useDiaries` cloned exactly for `useConversations` — same SSR-safe `isReady` pattern.
- `setupNextNavigation.ts` test helper reused in page tests (`mockRouter`, `resetNavigationMocks`).
- `makeConversation` fixture from `src/lib/storage/__tests__/fixtures.ts` used in storage tests.
- `bg-cream`, `bg-paper`, `text-charcoal`, `text-meta` design tokens consistent with all other screens.
- `vi.mock('@/lib/storage/useConversations', ...)` pattern in page tests mirrors `useDiaries` page test mocking in `ListScreen.test.tsx`.
- `@vitest-environment happy-dom` at file top for all component/hook tests.

---

## Tests Added / Updated

| File | Cases | IDs | Result |
|---|---|---|---|
| `src/lib/utils/__tests__/formatRelativeTime.test.ts` | 10 | FRT1–FRT10 | PASS |
| `src/lib/storage/__tests__/useConversations.test.ts` | 2 | UC1–UC2 | PASS |
| `src/app/chat/_components/__tests__/ConversationCard.test.tsx` | 6 | CC1–CC6 | PASS |
| `src/app/chat/__tests__/page.test.tsx` | 6 | CL1–CL6 | PASS |
| **Total new** | **24** | | **PASS** |

Full suite: 50 test files, 346 tests, 0 failed.

---

## Commands Run

```
npx tsc --noEmit          → 0 errors
npm run lint              → No ESLint warnings or errors
npx vitest run --reporter=basic → 50 files, 346 tests passed, 0 failed
```

---

## Risks / Follow-ups

1. **`ConversationCard` navigates to `/chat/${id}`** — route not yet implemented (REQ-018). Hardcoded per API contract; will work once REQ-018 adds the route.
2. **`NewChatButton` navigates to `/chat/new`** — route not yet implemented (REQ-016). Same situation.
3. **`formatRelativeTime` uses local-time calendar-day boundaries** for "어제" and X일 전. Correct for a diary app where dates are local; would need UTC-aware variant if ever deployed across time zones with server-side rendering of relative times.
4. **`useConversations` is read-once on mount** — no live subscription. Sufficient for the list screen; REQ-016/018 will need to handle optimistic updates or re-reads after writes.
5. **`NewChatButton` text** uses HTML entity `&nbsp;` between ➕ and label text to approximate the two-space spec. The accessible aria-label matches spec exactly ("새 대화 시작", no emoji).

---

## Verdict
PASS
