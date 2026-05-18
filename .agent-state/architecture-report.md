# Architecture Report — REQ-007

## Summary

REQ-007 converts `src/app/page.tsx` from placeholder stub into the main calendar screen. All upstream dependencies (REQ-001~006) confirmed DONE. Stack: Next.js 15 App Router + React 19 + Tailwind 4 + TypeScript 5 strict + Vitest + RTL. No Playwright installed yet. Design-system has 5 reusable primitives. Storage layer is pure (no React). All navigation through `Routes`. Page is a 7-line placeholder with no state. Everything needed for REQ-007 is present and stable.

---

## Frontend Findings

**Existing route files:**
- `src/app/page.tsx` — 7-line placeholder, no `"use client"`. Becomes thin client boundary.
- `src/app/layout.tsx` — provides `mx-auto min-h-dvh max-w-[420px] bg-cream`. REQ-007 must not add a competing width.
- `src/app/diary/[date]/page.tsx`, `chat/page.tsx`, `list/page.tsx`, `stats/page.tsx` — valid navigation targets.

**Design-system primitives available:**
- `MoodIcon` Server Component, `{ id: MoodId, size: number, className? }`. Use `size={32}` in cells.
- `IconButton` `"use client"`, `{ icon: ReactNode, label, onClick, disabled?, className? }`. 44×44 enforced. `bg-paper rounded-full` matches PRD §1.6.5.
- `FAB` `"use client"`, `{ icon, label, onClick, className? }`. Fixed `bottom-6 right-6`, 56×56, `bg-charcoal`. No collision with calendar.
- `Card`, `BottomSheet`, `Toast`, `EmptyState`, `ConfirmDialog`, `useDialogControl`, `useToast` — exist but none needed for REQ-007.

**Component split (confirmed by intake):**
- `src/app/page.tsx` — thin `"use client"` boundary
- `src/app/_components/CalendarScreen.tsx` — `useState<Date>` for visible month, `useDiaries()`, swipe handlers, navigation callbacks
- `src/app/_components/CalendarHeader.tsx` — 3 right-side IconButtons + month label + ‹/› arrows
- `src/app/_components/CalendarGrid.tsx` — pure grid; `{ year, month, diaryByDate: Map<string, DiaryEntry>, today: string, onCellTap }`
- `src/app/_components/CalendarDayCell.tsx` — single cell, `React.memo`-wrapped

**`_components` convention:** Next.js treats `_`-prefixed folders as private (non-routable). `src/app/_components/` correct for screen-local composites. Cross-screen composites graduate to `src/components/` when second consumer appears.

**Swipe handling:** Native pointer events (`onPointerDown`/`onPointerUp` delta). No new dep. Horizontal threshold ~40–50px. Vertical scroll unaffected (calendar doesn't scroll).

**Icon SVGs for header:** `lucide-react` is in CLAUDE.md Option B notes but NOT in `package.json`. Recommend inline SVG — 3 simple shapes (search, bar-chart, list), zero deps, aligns with CLAUDE.md "no new frameworks" principle.

**Today's date emphasis:** When cell has MoodIcon, render small `bg-peach` dot beneath. When cell shows number, apply `font-bold text-peach`. `--color-peach: #F5C896` already in tokens.

**Grey number for empty cells:** `#C8C8C8` from PRD §4.1.4. Not exactly an existing token (`--color-meta` is `#A8A8A8`). Add a new `--color-cell-empty: #C8C8C8` to `globals.css` for token discipline.

---

## Backend Findings

Not applicable. Pure frontend; reads localStorage via existing abstraction.

---

## Data Model Findings

**`DiaryEntry`** (from REQ-002): `id`, `date` (YYYY-MM-DD), `mood: MoodId`, `text`, `textAlign`, `photos[]`, `createdAt`, `updatedAt`. One per date enforced by `upsertDiary` dedup.

**Calendar lookup index:** `useMemo` a `Map<string, DiaryEntry>` keyed by `entry.date`. O(1) per-cell lookup vs O(N) `find` across up to 31 cells per render.

**`readDiaries()`** returns `[]` during SSR. Call inside `useEffect` after mount — correct pattern, confirmed by storage layer design.

**`useDiaries()` hook location:** `src/lib/storage/useDiaries.ts`. Mild concern about mixing React into a pure-data folder. Mitigation: file has `"use client"` directive + comment "React hook — client-only, not re-exported from index.ts". Filename + directive provide clear separation.

No schema changes, no migrations.

---

## Test Structure Findings

**Vitest config:** env `node` global, override per-file with `// @vitest-environment happy-dom`. `setupFiles` loads localStorage shim that installs on `globalThis` + `globalThis.window`, clears before each test.

**`next/navigation` mock helper:** at `src/lib/navigation/__tests__/setupNextNavigation.ts`. Pattern: `vi.mock('next/navigation', () => ({ ... }))` at top + `beforeEach(resetNavigationMocks)`. Used by `diary-date-page.test.tsx`.

**Fixture factory:** `src/lib/storage/__tests__/fixtures.ts` — `makeDiary(overrides?)`. REQ-007 tests should use this.

**Existing patterns:** `diary-date-page.test.tsx` for async Server Component + navigation mock; `IconButton.test.tsx` for client component render + fireEvent + source-guard.

**Playwright:** Not installed. REQ-007 must add `@playwright/test` devDep, create `playwright.config.ts` at root, create `e2e/` folder, add `test:e2e` script. `webServer` config to start `next dev` on port 3000 with `reuseExistingServer: !process.env.CI`. Chromium-only for MVP.

---

## Tooling and Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `vitest run` |
| `npm run test:watch` | watch |
| `npm run test:e2e` | TBA — `playwright test` |

Package manager: npm.

---

## Existing Patterns to Reuse

1. `"use client"` + `useEffect` for localStorage reads.
2. `// @vitest-environment happy-dom` per-file directive.
3. `vi.mock('next/navigation', () => ({ ... }))` + `resetNavigationMocks()`.
4. `makeDiary(overrides?)` from fixtures.
5. `IconButton` with `icon: ReactNode` — caller provides SVG.
6. `Routes.*` for all navigation.
7. CSS tokens from `globals.css` — no hardcoded hex.
8. `React.memo` + `useCallback` pair for cell memoization.

---

## Files Likely to Change

| File | Change |
|---|---|
| `src/app/page.tsx` | Replace placeholder with thin `"use client"` boundary |
| `src/app/_components/CalendarScreen.tsx` | Create |
| `src/app/_components/CalendarHeader.tsx` | Create |
| `src/app/_components/CalendarGrid.tsx` | Create |
| `src/app/_components/CalendarDayCell.tsx` | Create |
| `src/lib/storage/useDiaries.ts` | Create |
| `src/app/globals.css` | Add `--color-cell-empty: #C8C8C8` to `@theme` |
| `package.json` | Add `@playwright/test` devDep + `test:e2e` script |
| `playwright.config.ts` | Create (root) |
| `e2e/calendar.spec.ts` | Create — golden path: app open → calendar → FAB → /diary/[today] |
| `src/app/__tests__/CalendarScreen.test.tsx` (or per-component) | Create |

---

## Risks

1. **`MoodIcon` Server Component inside `CalendarDayCell` Client Component.** RSC can render inside client components if no client-only APIs used. `MoodIcon` has no hooks/browser APIs → safe to import. In fully-client subtree, executes on client without error.

2. **Vitest env mismatch for new tests.** Global is `node`; calendar uses `useState`/`useEffect`/`useRouter`. Test files MUST include `// @vitest-environment happy-dom` + `vi.mock('next/navigation')`.

3. **Swipe + pointer events in happy-dom.** happy-dom 20.x supports `PointerEvent`. `fireEvent.pointerDown`/`pointerUp` with `clientX` deltas should work. Fallback: mouse events.

4. **`#C8C8C8` grey not existing token.** Add `--color-cell-empty` to `globals.css` `@theme` block. Keeps token discipline.

5. **Playwright requires browser download.** `npx playwright install chromium` in CI. `playwright.config.ts` `webServer` block with `reuseExistingServer: !process.env.CI`.

---

## Unknowns

1. **Icon SVG source for 3 header buttons**: lucide-react vs inline SVG. Recommend inline (no new dep).
2. **`useDiaries` re-export from barrel**: recommend NO — keep `import { useDiaries } from '@/lib/storage/useDiaries'` (direct).
3. **Weekday header row (일월화수목금토)**: implied by PRD §4.1 7-column grid but not in REQ-007 acceptance criteria. Belongs in `CalendarGrid` or `CalendarHeader`. Design phase decides location.

---

## Verdict
PASS
