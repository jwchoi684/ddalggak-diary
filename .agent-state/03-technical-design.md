# Technical Design — REQ-008

## Goal

Deliver `MoodPickerSheet`, a single composite client component wrapping REQ-005's `BottomSheet`. User picks 1 of 10 fixed moods. Supports two entry modes (`initial` / `change`) sharing same UI, differing only in close-callback dispatch. No new libraries, no new primitives, no backend.

---

## Resolved Unknowns + Risks

**Unknown 1 — Toast positioning inside `<dialog>`.** `Toast.tsx` uses `fixed bottom-24`. Inside `showModal()` top-layer, `fixed` is relative to dialog's containing block (not viewport). Pre-emptively pass `className="!bottom-6 left-1/2 -translate-x-1/2"` for in-sheet context. Test verifies text appears, not pixel position.

**Unknown 2 — Sub-component split.** Total file likely 100–130 lines. Extract `MoodPickerTabs` as PRIVATE (non-exported) function in same `MoodPickerSheet.tsx`. If file exceeds 110 lines, move to `src/design-system/MoodPickerTabs.tsx` named export. Inline-first; revisit only if hit.

**Risk 1 — Toast z-index inside dialog.** Addressed: `<Toast>` is last child inside BottomSheet `children` fragment. `z-50` in top-layer context is fine.

**Risk 2 — MoodIcon (Server) in Client.** Legal in Next.js 15. No action.

**Risk 3 — Date TZ.** Use `new Date(date + 'T00:00:00')` (local TZ) — never `new Date(date)` (UTC midnight).

**Risk 4 — `handleCancel` double-call.** `useDialogControl` only fires `onClose` on `e.target === ref.current` (backdrop), not children. X click doesn't bubble to backdrop. No code change; test case locks behavior.

---

## File Layout

| File | Role | Budget |
|---|---|---|
| `src/design-system/MoodPickerSheet.tsx` | Component | target 95, cap 110 |
| `src/design-system/__tests__/MoodPickerSheet.test.tsx` | Vitest | target 95, cap 110 |

Conditional: `src/design-system/MoodPickerTabs.tsx` (only if hit 110-line cap).

No existing files modified.

---

## Props Signature

```ts
import type { MoodId } from '@/lib/storage';

export interface MoodPickerSheetProps {
  open: boolean;
  date: string;                 // ISO 'YYYY-MM-DD', local TZ
  selectedMoodId?: MoodId;      // undefined in 'initial'; set in 'change'
  mode: 'initial' | 'change';
  onSelect: (moodId: MoodId) => void;
  onClose: () => void;
  onCancelInitial?: () => void; // ONLY in mode='initial' AND closed without select
}
```

---

## Component Skeleton

```tsx
"use client";

import React from 'react';
import type { MoodId } from '@/lib/storage';
import { MOODS } from '@/design-system/moods';
import { BottomSheet } from '@/design-system/BottomSheet';
import { Toast } from '@/design-system/Toast';
import { useToast } from '@/design-system/useToast';
import { IconButton } from '@/design-system/IconButton';
import { MoodIcon } from '@/design-system/MoodIcon';

const WEEKDAY_FMT = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' });

function formatSheetDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return `${date.replace(/-/g, '.')} ${WEEKDAY_FMT.format(d)}`;
}

const CloseIcon = (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="6" y1="18" x2="18" y2="6" />
  </svg>
);

function MoodPickerTabs({ onInactiveTap }: { onInactiveTap: () => void }) {
  return (
    <div className="mb-4">
      <div className="flex gap-4 mb-1">
        <button type="button"
          className="text-sm font-medium text-charcoal border-b-2 border-charcoal pb-1 min-h-[44px] px-2">
          기본
        </button>
        <button type="button" onClick={onInactiveTap}
          className="text-sm text-meta pb-1 min-h-[44px] px-2">
          테마
        </button>
      </div>
      <div className="flex gap-4">
        <button type="button"
          className="text-xs font-medium text-charcoal border-b-2 border-charcoal pb-1 min-h-[44px] px-2">
          기분
        </button>
        <button type="button" onClick={onInactiveTap}
          className="text-xs text-meta pb-1 min-h-[44px] px-2">
          일상
        </button>
      </div>
    </div>
  );
}

export interface MoodPickerSheetProps { /* as above */ }

export function MoodPickerSheet({
  open, date, selectedMoodId, mode, onSelect, onClose, onCancelInitial,
}: MoodPickerSheetProps) {
  const toast = useToast();

  function handleCancel() {
    if (mode === 'initial') onCancelInitial?.();
    onClose();
  }

  function handleSelect(moodId: MoodId) {
    onSelect(moodId);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={handleCancel}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-meta">{formatSheetDate(date)}</p>
          <h2 className="text-lg font-medium text-charcoal">오늘은 어떤 하루였나요?</h2>
        </div>
        <IconButton icon={CloseIcon} label="닫기" onClick={handleCancel} />
      </div>

      <MoodPickerTabs onInactiveTap={() => toast.show('곧 만나요!')} />

      <div className="grid grid-cols-3 gap-4">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            aria-label={mood.label}
            onClick={() => handleSelect(mood.id)}
            className={`flex flex-col items-center gap-2 p-2 rounded-[var(--radius-card)] min-h-[44px]${
              mood.id === selectedMoodId ? ' ring-2 ring-peach bg-peach-light/30' : ''
            }`}
          >
            <MoodIcon id={mood.id} size={72} />
            <span className="text-sm text-charcoal">{mood.label}</span>
          </button>
        ))}
      </div>

      <Toast
        message={toast.message}
        open={toast.open}
        onClose={toast.hide}
        className="!bottom-6 left-1/2 -translate-x-1/2"
      />
    </BottomSheet>
  );
}
```

---

## Date Formatter

`formatSheetDate(date: string): string` — module-level private function, not exported. If REQ-009's editor needs the same format, promote to `src/lib/formatDate.ts` at that point.

Input: ISO `'YYYY-MM-DD'`. Output: `'2026.05.17 일'` (dot-separated + Korean single-char weekday). Local TZ guaranteed.

---

## CloseIcon SVG

Inline feather-style X, module-level constant. Passed to `IconButton`'s `icon` prop.

---

## Tab Strip Structure

Two rows of inline Tailwind tabs. No `Tabs` primitive (single usage).

Active: `font-medium text-charcoal border-b-2 border-charcoal`. Inactive: `text-meta`.

Critical:
- Inactive tabs MUST NOT carry `disabled` — must receive pointer events for toast.
- Stateless — only one tab per row ever active in v1. Active styling is static.
- All 4 tab buttons `min-h-[44px] px-2`.

---

## Backend Design

None. Purely compositional frontend.

---

## Data Model / Migration Design

None. Existing types/data only.

---

## Test Design (handover to Phase 8)

File: `src/design-system/__tests__/MoodPickerSheet.test.tsx`. `// @vitest-environment happy-dom`.

Setup: `vi.fn()` stubs for `HTMLDialogElement.prototype.{showModal, close}` in `beforeEach`; `vi.useFakeTimers()`/`useRealTimers()`; `cleanup()` in `afterEach`.

Helper:
```ts
const defaultProps: MoodPickerSheetProps = {
  open: true, date: '2026-05-17', mode: 'change',
  onSelect: vi.fn(), onClose: vi.fn(),
};
```

10 cases:
1. `open=true` → `showModal` called; `open=false` → `close` called.
2. Header: `'2026.05.17 일'` + `'오늘은 어떤 하루였나요?'`.
3. 10 mood buttons rendered (query by mood label).
4. Mood tap → `onSelect(moodId)` then `onClose`; not `handleCancel`/`onCancelInitial`.
5. X click → `onClose` exactly once.
6. `mode='initial'` + X: `onCancelInitial` called once AND `onClose` once.
7. `mode='change'` + X: `onCancelInitial` NOT called; `onClose` once.
8. Inactive tab tap (테마 or 일상): `'곧 만나요!'` toast appears.
9. `selectedMoodId='joy'`: joy button has `ring-2` + `ring-peach` classes; others don't.
10. Source-guard: contains `"use client"` (`fs.readFileSync`).

---

## Implementation Order

1. `MoodPickerSheet.tsx` — imports, `formatSheetDate`, `CloseIcon`, `MoodPickerTabs`, `MoodPickerSheet`. Strict TS — no `any`.
2. Verify dependencies resolve via existing `@/design-system/*` and `@/lib/storage`.
3. `MoodPickerSheet.test.tsx` — 10 cases with mocks.
4. `npm run typecheck` — must pass.
5. `npm test` — all tests pass, no regressions.
6. `npm run lint` + `npm run build` — clean.

---

## Backward Compatibility

No existing file modified. Net-new export. REQ-009 will import it.

---

## Performance Considerations

- `MOODS`, `WEEKDAY_FMT`, `CloseIcon` module-level constants — zero per-render allocation.
- `MoodIcon` (Server Component) imported into Client boundary — Next.js handles, no JS bundle bloat from MoodIcon internals.
- BottomSheet always-mounted (REQ-005 invariant). 10 cells always rendered but hidden off-screen when `open=false`. Negligible cost.

---

## Infra / Deployment Considerations

None.

---

## Risks and Tradeoffs

**Tab touch-target horizontal:** `text-sm` Korean text width may be ≤ 44px alone. Added `px-2` to widen tap area.

**Static tabs vs `useState`:** Static correct for v1 (one tab per row ever active). v2 may swap to state without breaking external API.

**Inline `MoodPickerTabs` vs separate file:** Inline-first; extract if line count exceeds 110.

**`className` Toast positioning:** `!bottom-6` is assumption-based; refine if visual review finds clipping.

---

## Open Questions

None blocking. All unknowns + risks addressed.

---

## Verdict
PASS
