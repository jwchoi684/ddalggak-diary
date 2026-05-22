# Requirement Intake — REQ-013

## Restatement

REQ-013 adds a "diary list" screen reachable at `/list`. It displays all diary entries for a selected calendar month as vertically scrollable cards. The header provides: a back button (left), a month navigator showing "YYYY년 M월" with previous/next chevrons (center), and a sort toggle switching between "↓ 최신순" and "↑ 오래된 순" (right). Each card shows, top to bottom: a 64px MoodIcon centered at the top, a date label in "YYYY.MM.DD 요일" format in gray, up to 3 lines of body text (ellipsis on overflow), and a horizontal photo thumbnail strip (max 3 thumbnails plus a "+N" overflow cell). Tapping a card navigates to the editor screen (`/diary/[date]`); browser back returns to the list with the same month and sort state intact.

## In Scope

- List screen implementation at `src/app/list/page.tsx` (replacing the stub from REQ-006).
- Month navigator state: default month, prev/next controls, year rollover.
- Filtering: show only entries whose `date.slice(0, 7)` matches the selected `YYYY-MM`.
- Sort toggle: newest-first (default) / oldest-first, toggled in-memory via `useState`.
- Card layout: MoodIcon 64px + date label + body text (3-line clamp) + photo strip (max 3 + "+N").
- Empty body text fallback: "(내용 없음)".
- Empty month state: centered message "이 달에는 작성된 일기가 없어요" + CTA link to calendar (`/`). Month nav remains visible and functional.
- Card tap routing: `router.push('/diary/[date]')`.
- Back button: `router.back()` (REQ-006 history-stack).
- File decomposition: `ListScreen.tsx` (orchestration), `DiaryListCard.tsx` (single card), `useDiaryList.ts` (filtering + sorting logic).
- Reuse of `Card` from `src/design-system/Card.tsx` and `MoodIcon` from REQ-003.

## Out of Scope (with pointer to owner REQ if known)

- Mood filter ("😢만 모아보기") — v2, §4.5.7.
- Text search within month — v2, §4.5.7.
- Multi-month infinite scroll — v2, §4.5.7.
- Sort state persistence to localStorage — v2, §4.5.7.
- Full-screen photo viewer from list card — REQ-012 (already done; linking from card not required by this REQ).
- AI chat citation back-link chip — REQ-017.
- Statistics screen — REQ-014 (parallel, independent).

## Invariants

- `Card` component from `src/design-system/Card.tsx` must be used as the card surface. No new card style may be created.
- `MoodIcon` from the design system (REQ-003) must be the sole rendering boundary for mood visuals; the 64px size must be passed as a prop/size, not inlined as a new component.
- `readDiaries()` (or `useDiaries`) from `src/lib/storage/` is the only read path. No direct `localStorage` access in the screen component.
- One entry per day is enforced by the storage layer (REQ-002/REQ-009); the list screen must not handle or anticipate duplicates.
- Sort is `useState` only — never written to `ddalkkak:settings:v1` or any localStorage key.
- Filtering is by `entry.date.slice(0, 7) === selectedYearMonth` (e.g., `"2026-05"`) — exact string prefix match on the "YYYY-MM-DD" date field.
- Sort is a lexicographic comparison on `entry.date` (ISO "YYYY-MM-DD" strings sort correctly with plain string comparison).
- Visual tokens: background `#FAF6EE` (cream / `bg-cream`), card background `#FFFFFF` (`bg-paper`), gray meta text `#A8A8A8` (`text-meta`), body text `#2A2A2A` (`text-charcoal`). No raw hex in component files.
- All UI strings are Korean.
- Touch targets must be 44×44px minimum (header buttons, card tap area).
- File size rule: any file approaching 100 lines must be split at a natural boundary.

## Open Questions and Recommended Defaults

**Q1. Default month when navigating from calendar vs. other routes.**
The PRD says: if entering from the calendar, use the calendar's currently-displayed month; otherwise use current month. REQ-006 does not currently pass calendar month context through the URL or router state.
Recommended default: use the current calendar month (today's year+month) as the initial `selectedMonth` for all entry paths in this REQ. If REQ-006 is later extended to pass `?month=YYYY-MM` as a query param, the list screen can read `searchParams.get('month')` as an override.

**Q2. Month navigation bounds.**
The PRD says "미래 달도 이동 가능" (future months are reachable). It does not specify a lower bound.
Recommended default: no bounds. Users can navigate to any month (past or future). Empty months display the empty-state UI.

**Q3. Photo thumbnail size.**
The PRD says "64~72px" for photo thumbnails inside the card.
Recommended default: 64px square to align with the MoodIcon size given in the same section.

**Q4. "+N" overflow cell rendering.**
The PRD shows a `+N` label after 3 thumbnails but does not specify the cell's appearance.
Recommended default: same 64px square as thumbnail cells, gray background (`bg-[#A8A8A8]/20` or equivalent design token), centered `+N` text in `text-charcoal`. N = `photos.length - 3`.

**Q5. Date format in card.**
The PRD shows "YYYY.MM.DD 요일" (e.g., "2026.05.16 토요일") in the wireframe (§4.5.1) and §4.5.4.
Recommended default: use this exact format — dot-separated date, space, Korean weekday. Use `Intl.DateTimeFormat('ko-KR', { weekday: 'short' })` for the weekday string.

**Q6. Month transition animation.**
§4.5.6 says "부드러운 전환 (페이드 또는 슬라이드)."
Recommended default: CSS opacity fade via a key-based re-render (`key={selectedMonth}` on the list container triggers React's unmount/mount, Tailwind's `animate-fade-in` or a simple `transition-opacity`). Slide animation is deferred unless the design system already ships a slide primitive.

**Q7. Empty-body card rendering.**
§4.5.4 says "(내용 없음)" OR "그냥 사진/기분만 표시." This is ambiguous.
Recommended default: if `entry.text` is empty or whitespace-only and `entry.photos.length === 0`, render the italic gray string "(내용 없음)" in the body area. If photos exist but text is empty, omit the body text area entirely. If text is empty but mood is the only content, show "(내용 없음)".

**Q8. `useDiaries` hook vs. direct `readDiaries()` call.**
`src/lib/storage/useDiaries.ts` already exists (from REQ-002).
Recommended default: use the existing `useDiaries` hook inside `useDiaryList.ts` rather than calling `readDiaries()` directly. This keeps re-render reactivity consistent with how the editor uses storage.

## Dependency Check

| REQ | Required Status | Actual Status (index.md) |
|-----|----------------|--------------------------|
| REQ-002 | DONE | DONE |
| REQ-003 | DONE | DONE |
| REQ-005 | DONE | DONE |
| REQ-006 | DONE | DONE |

All four dependencies are confirmed DONE. The route stub at `src/app/list/page.tsx` from REQ-006 is present and safe to replace.

Note: REQ-009 (editor) is also DONE and reachable at `/diary/[date]`, which is the navigation target for card taps. Although REQ-009 is not listed as a formal dependency of REQ-013, its existence is a precondition for the card-tap flow to function end-to-end.

## Verdict
PASS
