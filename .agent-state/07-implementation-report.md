# Frontend Implementation — REQ-018

## Summary

REQ-018: Read-only past conversation view (mode D) at `/chat/[id]`.

The screen shows a closed conversation's messages without any input element in the DOM. It provides a delete action via `ConfirmDialog` and a "새 대화 시작" bottom banner. The `notFound()` Next.js primitive is called immediately when the conversation id is not found in storage.

## Files Changed

### New production files

| File | Lines | Purpose |
|---|---|---|
| `src/app/chat/[id]/_components/ReadOnlyChatHeader.tsx` | 81 | Header: ‹ back + persona emoji + "{label} (종료됨)" center + optional 🗑 delete icon button |
| `src/app/chat/[id]/page.tsx` | 112 | ReadOnlyChatPage — uses `useConversations()` + `useParams()`, renders messages, bottom banner, ConfirmDialog; calls `notFound()` for unknown ids |

### New test files

| File | Lines | Cases |
|---|---|---|
| `src/app/chat/[id]/__tests__/page.test.tsx` | 177 | 5 (RC1–RC5) |

## Behavior Added

1. Route `/chat/[id]` renders a past conversation in read-only mode.
2. `notFound()` is called synchronously when the conversation id is absent from `useConversations()` after `isReady === true`.
3. Loading skeleton shown while `isReady === false`.
4. No `<textarea>` or `<input type="text">` is ever mounted — `ChatComposer` is absent from the component tree entirely.
5. Header center shows `{persona.emoji}` + `{persona.label} (종료됨)` per REQ-018 spec.
6. Header right renders a trash `IconButton` (label `대화 삭제`) that opens a `ConfirmDialog` with `destructive` mode.
7. Confirm → `removeConversation(id)` → `router.push(Routes.chat)` (`/chat`).
8. Cited diary chips in `MessageBubble` tap → look up entry by id in `useDiaries()` → `router.push(Routes.diary(entry.date))`.
9. Bottom banner: "종료된 대화입니다. 추가 질문은 새 대화에서 해주세요." + "새 대화 시작" button → `/chat/new`.
10. Back button (header left) → `router.push(Routes.chat)` (returns to conversation list, REQ-015).

## Existing Patterns Reused

- `MessageBubble` from `src/app/chat/session/_components/MessageBubble` — no movement needed; imported via relative path `../session/_components/MessageBubble`.
- `CitedDiaryChip` — indirectly used via `MessageBubble` (already integrated).
- `ConfirmDialog` from `@/design-system/ConfirmDialog` — identical pattern to diary editor delete flow.
- `EmptyState` from `@/design-system/EmptyState` — persona-not-found fallback.
- `IconButton` from `@/design-system/IconButton` — back chevron and trash icon.
- `useConversations` from `@/lib/storage/useConversations` — same hook used by `ChatPage`.
- `useDiaries` from `@/lib/storage/useDiaries` — same hook used by `ActiveChatPage`.
- `PERSONA_MAP` from `@/design-system/personas` — O(1) persona lookup.
- `removeConversation` from `@/lib/storage` — existing storage primitive.
- `Routes` from `@/lib/navigation` — typed route builder for `Routes.chat`, `Routes.diary(date)`.
- Test pattern: `setupNextNavigation` + `vi.mock` + top-level `await import` — identical to REQ-016/017 tests.
- `@vitest-environment happy-dom` — consistent with all other UI tests.

## Tests Added / Updated

5 new test cases in `src/app/chat/[id]/__tests__/page.test.tsx`:

- **RC1** — renders user and assistant messages from seeded conversation.
- **RC2** — `document.querySelector('textarea')` and `document.querySelector('input[type="text"]')` both return `null`.
- **RC3** — header contains `"친구 (종료됨)"` (friend persona example).
- **RC4** — delete button click → `ConfirmDialog` → confirm click → `removeConversation('conv-readonly-1')` called, `router.push('/chat')` called.
- **RC5** — unknown id with `isReady=true` → `notFound()` throws `'NEXT_NOT_FOUND'`.

## Commands Run

```
npx tsc --noEmit        → 0 errors
npm run lint            → 0 warnings / 0 errors
npx vitest run          → 378/378 passed (58 test files)
```

## Risks / Follow-ups

1. `page.tsx` is 112 lines — slightly above the 100-line guideline. The file has two distinct conditional render branches (loading state and persona-not-found fallback) plus the main page body; splitting would create unnecessary complexity for a thin page. The guideline allows exception when splitting is unnatural.
2. `MessageBubble` and `CitedDiaryChip` remain in `session/_components/`. If a third caller emerges these should move to `chat/_components/` shared location. For two callers (session page + [id] page), relative import is acceptable per the prompt instruction.
3. Initial scroll position is at top by default (no `scrollIntoView` call), matching the spec requirement ("최상단 — 대화 회상용").
4. No E2E test covers the list → read-only → chip → diary → back → read-only flow. Recommended as a Playwright spec in a follow-up.

## Verdict
PASS
