# Technical Design — REQ-007

## Goal

Convert `src/app/page.tsx` from placeholder to main calendar screen: 7-column monthly mood grid, 3-icon header, horizontal swipe month nav, FAB → today's diary editor. Also bootstraps Playwright E2E.

---

## Resolved Unknowns

**1 — Icon SVG source: inline SVG.** `lucide-react` is in CLAUDE.md notes but NOT in `package.json`. 3 small inline SVGs cost ~60 bytes each, tree-shaken. Aligns with "no new deps" principle.

**2 — `useDiaries` barrel re-export: NO.** Storage barrel is SSR-safe pure-data. Hook file has `"use client"` — must not be pulled into Server Component trees via barrel. Direct import: `import { useDiaries } from '@/lib/storage/useDiaries'`. File comment: `// React hook — client-only. Direct import only; NOT re-exported.`

**3 — Weekday header row location: inside `CalendarGrid`.** Grid is self-contained layout unit. Keeps `CalendarHeader` focused on month + nav.

---

## File Layout

| File | Type | Budget |
|---|---|---|
| `src/app/page.tsx` | Replace | ≤ 8 |
| `src/app/_components/CalendarScreen.tsx` | Create | ≤ 90 |
| `src/app/_components/CalendarHeader.tsx` | Create | ≤ 70 |
| `src/app/_components/CalendarGrid.tsx` | Create | ≤ 80 |
| `src/app/_components/CalendarDayCell.tsx` | Create | ≤ 50 |
| `src/lib/storage/useDiaries.ts` | Create | ≤ 35 |
| `src/app/globals.css` | Additive | +1 line |
| `playwright.config.ts` | Create | ≤ 40 |
| `e2e/calendar.spec.ts` | Create | ≤ 50 |
| `package.json` | Edit | +2 entries |
| `src/app/__tests__/CalendarScreen.test.tsx` | Create | ≤ 80 |
| `src/app/__tests__/CalendarGrid.test.tsx` | Create | ≤ 80 |
| `src/app/__tests__/CalendarDayCell.test.tsx` | Create | ≤ 60 |
| `src/app/__tests__/CalendarHeader.test.tsx` | Create | ≤ 50 |
| `src/lib/storage/__tests__/useDiaries.test.ts` | Create | ≤ 50 |

---

## globals.css Additive Change

In `@theme` block, after `--color-success: #B4E4B4;`:
```css
--color-cell-empty: #C8C8C8;
```

---

## Inline SVG Path Data (3 icons)

24×24, `stroke="currentColor"`, `strokeWidth="2"`, `fill="none"`, `strokeLinecap="round"`, `strokeLinejoin="round"`. Feather-style.

**검색 (Search)**: `circle cx="11" cy="11" r="8"` + `line x1="21" y1="21" x2="16.65" y2="16.65"`

**통계 (Stats)**: 3 rects — `(18,3,4,18)`, `(11,9,4,12)`, `(4,14,4,7)`

**리스트 (List)**: 3 long lines (8→21 at y=6/12/18) + 3 dot lines (3→3.01 at y=6/12/18)

Defined as JSX constants at top of `CalendarHeader.tsx`.

---

## useDiaries Hook

`src/lib/storage/useDiaries.ts`:

```ts
// React hook — client-only. Direct import only;
// NOT re-exported from @/lib/storage/index.ts (that barrel is SSR-safe).
"use client";

import { useEffect, useState } from 'react';
import { readDiaries, type DiaryEntry } from '@/lib/storage';

export function useDiaries(): { entries: DiaryEntry[]; isReady: boolean } {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setEntries(readDiaries());
    setIsReady(true);
  }, []);

  return { entries, isReady };
}
```

`isReady` lets caller suppress grid during first hydration frame.

---

## CalendarScreen Skeleton

`src/app/_components/CalendarScreen.tsx`:

State: `useState<Date>` for visible month, `useMemo` for today + diaryByDate, `useRouter`, `useCallback` for stable callbacks, `useRef` for pointer-start tracking.

Layout: `<CalendarHeader>` + (when `isReady`) `<CalendarGrid>` + `<FAB icon={PenIcon} label="오늘 일기 쓰기" onClick={onFAB} />`.

Swipe: pointer events on container `<div>`, threshold ±40px. `e.clientX` delta → `nextMonth()` or `prevMonth()`.

Helper: `toDateKey(date: Date)` uses `date.toLocaleDateString('sv')` (Swedish locale yields YYYY-MM-DD natively).

---

## CalendarGrid Skeleton (with weekday row + date math)

`src/app/_components/CalendarGrid.tsx`:

Pure component, no `"use client"` needed (or include for safety; doesn't matter since rendered inside client tree).

Props: `{ year: number; month: number; diaryByDate: Map<string, DiaryEntry>; today: string; onCellTap: (date: string) => void }`.

`WEEKDAYS = ['일','월','화','수','목','금','토']` — 일요일 시작.

Date math (no date-fns):
- `firstDay = new Date(year, month, 1)`
- `lastDay = new Date(year, month + 1, 0).getDate()` (last-of-month idiom)
- `startOffset = firstDay.getDay()` (0=Sun…6=Sat)
- Build 42-slot array: leading nulls (startOffset) + `[1..lastDay]` + trailing nulls to next multiple of 7

Layout: `grid-cols-7` weekday header row + `grid-cols-7 gap-y-1` day cells. Empty slots = bare `<div>`. Real days = `<CalendarDayCell>`.

dateKey: `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`.

---

## CalendarDayCell Skeleton (with today highlight)

`src/app/_components/CalendarDayCell.tsx`:

`React.memo`-wrapped. Props: `{ date: string; entry?: DiaryEntry; isToday: boolean; onTap: (date: string) => void }`.

`<button type="button" aria-label={`${date}${entry ? ' 일기 있음' : ''}`} onClick={() => onTap(date)} className="flex flex-col items-center justify-center py-2 min-h-[44px]">`

Conditional:
- `entry` present → `<MoodIcon id={entry.mood} size={32} />` + (if today) `<span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-peach block" />`
- `entry` absent → `<span className={isToday ? 'text-sm font-bold text-peach' : 'text-sm text-cell-empty'}>{day}</span>`

`day = Number(date.slice(8))` extracts DD.

Touch target ≥ 44 via `min-h-[44px]`.

---

## CalendarHeader Skeleton

`src/app/_components/CalendarHeader.tsx`:

Props: `{ year, month, onPrev, onNext, onSearch, onStats, onList }`.

Layout: `<header className="flex items-center justify-between px-4 py-3">`:
- Left: `<div className="flex items-center gap-2">` — ‹ button + `M월` label (`text-3xl font-bold text-charcoal`) + › button. Arrows use Unicode `‹` `›` characters on plain `<button>` (not IconButton — distinguishes from circular header icons).
- Right: `<div className="flex items-center gap-2">` — 3 `<IconButton icon={SearchIcon|StatsIcon|ListIcon} label="검색"|"통계"|"리스트" onClick={...} />`

Year NOT rendered in header (PRD shows only `M월`). Trivial future addition if needed for cross-year nav.

---

## Playwright Config

`playwright.config.ts` (root):

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

---

## E2E Spec

`e2e/calendar.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동', async ({ page }) => {
  await page.goto('/');

  const today = new Date();
  const monthLabel = `${today.getMonth() + 1}월`;
  await expect(page.getByText(monthLabel)).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();

  await page.getByRole('button', { name: '오늘 일기 쓰기' }).click();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  await expect(page).toHaveURL(`/diary/${yyyy}-${mm}-${dd}`);
});
```

Role/name queries throughout. No `data-testid` in production code. FAB `aria-label="오늘 일기 쓰기"` is the selector anchor.

---

## package.json Changes

devDeps: `"@playwright/test": "^1.44.0"`.

Scripts: `"test:e2e": "playwright test"`, `"test:e2e:install": "playwright install chromium"`.

---

## Implementation Order

1. `globals.css` — `--color-cell-empty` token.
2. `src/lib/storage/useDiaries.ts` — hook.
3. `src/app/_components/CalendarDayCell.tsx` — leaf component.
4. `src/app/_components/CalendarGrid.tsx` — composes DayCell.
5. `src/app/_components/CalendarHeader.tsx` — IconButton consumer.
6. `src/app/_components/CalendarScreen.tsx` — state owner.
7. `src/app/page.tsx` — thin client boundary.
8. `package.json` — add Playwright dep + scripts. Run `npm install` + `npx playwright install chromium`.
9. `playwright.config.ts`.
10. `e2e/calendar.spec.ts`.
11. Full gates: `typecheck` / `lint` / `npm test` / `npm run build` / `npm run test:e2e`.

---

## Test Design Sketch

**useDiaries.test.ts** (happy-dom): isReady false initially → true after effect; entries populated from `readDiaries`; empty array case.

**CalendarDayCell.test.tsx** (happy-dom): no-entry+not-today (grey numeral, no MoodIcon); has-entry+not-today (MoodIcon, no dot); no-entry+today (bold peach numeral); has-entry+today (MoodIcon + peach dot); click fires `onTap(date)`.

**CalendarGrid.test.tsx** (happy-dom): May 2026 (month=4) — first day Friday (offset 5), 31 days; with `diaryByDate` for day 3 → MoodIcon on day 3 only; weekday row 일~토 visible.

**CalendarHeader.test.tsx** (happy-dom): "5월" rendered for month=4; 3 IconButtons fire correct callbacks (by aria-label); arrows fire onPrev/onNext.

**CalendarScreen.test.tsx** (happy-dom): mock `next/navigation` + `useDiaries`. Current month label visible; FAB click → router.push(Routes.diary(today)); ‹/› buttons change month; pointer swipe (clientX delta) changes month.

---

## Backward Compatibility

- `src/app/page.tsx` swap is user-transparent — `/` continues to serve home.
- `src/lib/storage/index.ts` unchanged. `useDiaries.ts` is new direct-import file.
- `globals.css` gets one additive token; no rename/removal.
- `package.json` gets devDep + scripts; no production bundle impact.
- All navigation continues through `Routes.*`.

---

## Performance Considerations

- `diaryByDate` Map via `useMemo([entries])` — rebuilds only on entries reference change (once on mount; REQ-009 writes will trigger).
- `CalendarDayCell` `React.memo` + `useCallback`-stabilized `onCellTap` — zero unnecessary cell re-renders on month transitions for unchanged dates.
- `useDiaries` synchronous localStorage read on mount (one read, ≤365 entries/year). Negligible.
- Swipe via pointer events, no passive-listener conflicts, no `preventDefault`, vertical scroll unaffected.
- E2E Chromium-only reduces CI time.

---

## Infra / Deployment Considerations

- `playwright.config.ts` `reuseExistingServer: !process.env.CI`.
- `test:e2e:install` is a one-time CI step. Downloads ~150MB; recommend browser path caching.
- No server-side code, no env vars, no infrastructure changes.

---

## Risks and Tradeoffs

1. **`MoodIcon` (RSC) inside `CalendarDayCell` (client).** Safe — `MoodIcon` has no hooks/browser APIs; executes on client without error. RSC caching benefits lost but no cacheable work to lose.
2. **`toLocaleDateString('sv')` ISO trick.** Works in all modern browsers incl. Safari 15+. Alternative: manual `padStart` formatting. Both acceptable.
3. **Swipe threshold 40px.** Too low = accidental month changes. Adjust to 50px if user testing reveals false positives.
4. **`isReady` guard hides grid on first paint.** Brief blank frame on slow connections. Skeleton component would address but out of MVP scope.
5. **Year not in month header.** PRD shows only `M월`. Cross-year nav makes year disappear briefly. Trivial to add `year` to label if needed; prop already received.

---

## Open Questions

1. Skeleton during `!isReady` vs current full-suppress. Current: full-suppress (`{isReady && <CalendarGrid ... />}`).
2. Pen icon SVG for FAB — same as inline SVG approach. Caller (`CalendarScreen`) supplies the JSX.
3. Year display when navigating across year boundaries — trivial future addition.

---

## Verdict
PASS
