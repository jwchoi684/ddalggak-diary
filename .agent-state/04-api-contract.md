# API / Interface Contract — REQ-008

## Summary

REQ-008 introduces `MoodPickerSheet`, a single composite React client component that presents a bottom-sheet modal for selecting one of the 10 fixed moods. The component is purely a UI boundary: it emits callbacks upward and has no side effects on storage, routing, or navigation. Its public API is a TypeScript props interface. There are no HTTP endpoints, RPC methods, GraphQL operations, queue messages, or WebSocket events involved. The contract is entirely an internal function/component signature contract.

---

## Contract Type

**Internal component props interface** — React component exported from `src/design-system/MoodPickerSheet.tsx`.

Relevant boundary types from the checklist:
- Internal function signature (React component + `MoodPickerSheetProps`)
- Shared type/schema (`MoodPickerSheetProps` consumed by REQ-009 editor)
- Frontend API client (the import path callers must use)

---

## Request / Input

### 1. Public Exports

**Import path (canonical, mandatory):**
```ts
import { MoodPickerSheet, type MoodPickerSheetProps } from '@/design-system/MoodPickerSheet';
```

`MoodId` required at the call site comes from the storage barrel, not from this module:
```ts
import type { MoodId } from '@/lib/storage';
```

**Exported identifiers:**
- `MoodPickerSheet` — named function export (React component), `'use client'` boundary
- `MoodPickerSheetProps` — named type export (interface)

**Not exported** (private to the file):
- `formatSheetDate` — module-level date formatter
- `CloseIcon` — module-level SVG constant
- `MoodPickerTabs` — inner tab-strip function (may be extracted to `src/design-system/MoodPickerTabs.tsx` if file exceeds 110 lines, but remains non-exported from the public barrel unless a second consumer appears)

---

### 2. Props Interface (Exact TypeScript Signature)

```ts
import type { MoodId } from '@/lib/storage';

export interface MoodPickerSheetProps {
  /** Controlled open state. When false the sheet slides down; component stays mounted. */
  open: boolean;

  /**
   * Calendar date for the entry being acted on.
   * Format: ISO 8601 'YYYY-MM-DD' (e.g. '2026-05-17').
   * Parsed in local timezone via `new Date(date + 'T00:00:00')`.
   * Rendered in the sheet header as 'YYYY.MM.DD 요일' (Korean single-char weekday).
   */
  date: string;

  /**
   * The currently selected mood to highlight.
   * Required when mode === 'change'; omitted (undefined) when mode === 'initial'.
   * When provided, the matching mood cell receives a peach ring + peach-tint background.
   */
  selectedMoodId?: MoodId;

  /**
   * Entry mode controlling close-callback dispatch.
   * 'initial' — sheet was auto-opened because the entry has no mood yet;
   *             closing without selecting must signal the editor to step back.
   * 'change'  — user re-tapped the mood icon to swap an existing mood;
   *             closing without selecting simply dismisses the sheet.
   */
  mode: 'initial' | 'change';

  /**
   * Called when the user taps any mood cell.
   * Argument: the MoodId literal of the tapped cell (one of the 10 fixed values).
   * The component also calls onClose() immediately after this callback.
   * onCancelInitial is NEVER called on a mood tap, even in mode='initial'.
   */
  onSelect: (moodId: MoodId) => void;

  /**
   * Called whenever the sheet closes — via X button, backdrop click, or Escape key.
   * Always fires as the LAST callback in the close sequence.
   * Also fires after onSelect (mood commit path).
   */
  onClose: () => void;

  /**
   * Called when mode === 'initial' AND the sheet is closed WITHOUT a mood selection.
   * Fires BEFORE onClose() in the close sequence.
   * Optional: safe to omit when mode === 'change' (the component treats it as a no-op).
   * Must NOT be called on a mood tap.
   */
  onCancelInitial?: () => void;
}
```

---

## Response / Output

`MoodPickerSheet` renders no return value beyond JSX. Its observable outputs are exclusively callback invocations and rendered DOM state.

### Rendered DOM Structure (Logical)

```
<dialog>                        ← BottomSheet's <dialog> (showModal/close controlled)
  [grip handle]                 ← BottomSheet internal; always present
  <div>                         ← BottomSheet's inner content wrapper
    <div>                       ← Header row
      <div>                     ← Date + title column
        <p>YYYY.MM.DD 요일</p>
        <h2>오늘은 어떤 하루였나요?</h2>
      </div>
      <IconButton label="닫기"/> ← X close button (44×44)
    </div>
    <MoodPickerTabs/>           ← Two-row tab strip
    <div class="grid-cols-3">  ← 10 mood cells
      <button aria-label={mood.label}> × 10
        <MoodIcon size={72}/>
        <span>{mood.label}</span>
      </button>
    </div>
    <Toast/>                    ← In-sheet toast, last child
  </div>
</dialog>
```

### Callback Dispatch Table

| User action | Callbacks fired (in order) |
|---|---|
| Tap mood cell | `onSelect(moodId)` → `onClose()` |
| Tap X button, `mode='initial'` | `onCancelInitial?.()` → `onClose()` |
| Tap X button, `mode='change'` | `onClose()` |
| Backdrop click, `mode='initial'` | `onCancelInitial?.()` → `onClose()` |
| Backdrop click, `mode='change'` | `onClose()` |
| Escape key, `mode='initial'` | `onCancelInitial?.()` → `onClose()` |
| Escape key, `mode='change'` | `onClose()` |
| Tap inactive tab ("테마" or "일상") | In-sheet `Toast('곧 만나요!')` shown; no prop callbacks |

All close paths (X, backdrop, Escape) funnel through a single internal `handleCancel()` that branches on `mode`. The mood-tap path calls `onSelect` then `onClose` directly and never reaches `handleCancel`.

---

## Validation Rules

### Date Format

- `date` MUST be an ISO 8601 date string in the form `'YYYY-MM-DD'`.
- `date` MUST be a valid calendar date (e.g. `'2026-05-17'`, not `'2026-13-01'`).
- `date` MUST NOT include a time component or timezone suffix (e.g. `'2026-05-17T00:00:00Z'` is invalid input).
- The component does not throw on invalid dates but renders a malformed header string — callers are responsible for passing valid ISO dates.

**Date rendering example:**

Input `date = '2026-05-17'` (Sunday) renders header label:
```
2026.05.17 일
```

Input `date = '2026-05-18'` (Monday) renders:
```
2026.05.18 월
```

The dot-separated date is derived by `date.replace(/-/g, '.')`. The weekday is derived via `Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(new Date(date + 'T00:00:00'))` — local timezone.

### MoodId Values

Valid `MoodId` literals (the complete set — no other values are accepted by TypeScript):
```
'joy' | 'love' | 'excited' | 'calm' | 'grateful' |
'sad' | 'angry' | 'anxious' | 'tired' | 'embarrassed'
```

`selectedMoodId`, when provided, must be one of these 10 literals.

### Mode Constraints

- `mode` accepts only `'initial'` or `'change'`. TypeScript enforces this.
- `selectedMoodId` should be `undefined` when `mode === 'initial'` (no existing mood to highlight).
- `selectedMoodId` should be a valid `MoodId` when `mode === 'change'` (existing mood to indicate).

---

## Error Handling

There are no runtime error states defined for this component. The component has no async operations, no network calls, and no storage access. TypeScript strict mode catches invalid prop types at compile time.

**Edge cases handled silently:**
- `selectedMoodId` provided with `mode === 'initial'` — component renders the highlight without error; this is a caller mistake but not guarded at runtime.
- `onCancelInitial` omitted with `mode === 'initial'` — the optional chaining `onCancelInitial?.()` makes this a no-op; no error thrown.
- `open` toggled rapidly — `BottomSheet` handles `showModal`/`close` sequencing internally via `useDialogControl`.

---

## Auth / Permission Rules

None. `MoodPickerSheet` is a pure UI component with no authentication, authorization, or permission checks.

---

## Backward Compatibility

`MoodPickerSheet` is a **net-new export**. No existing file is modified by REQ-008. There are no existing callers; REQ-009 will be the first consumer.

Future compatibility notes:
- The `mode` prop is an extensible string union — a future `'view'` mode (read-only past entry) would be additive and backward-compatible.
- The `onCancelInitial` callback is optional by design so that callers in `'change'` mode are not forced to supply a no-op.
- `MoodPickerTabs` (if eventually extracted) must remain unexported until a second consumer emerges; promoting it to a public design-system primitive is a non-breaking addition.
- The `date` prop format (`'YYYY-MM-DD'`) matches `DiaryEntry.date` — callers pass the entry's date directly without transformation.

---

## Examples

### Example 1 — `mode='initial'` (new entry, auto-opened by editor)

```tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoodPickerSheet } from '@/design-system/MoodPickerSheet';
import type { MoodId } from '@/lib/storage';

export function NewEntryEditor({ date }: { date: string }) {
  const router = useRouter();
  const [moodSheetOpen, setMoodSheetOpen] = useState(true); // auto-open
  const [selectedMood, setSelectedMood] = useState<MoodId | undefined>();

  function handleMoodSelect(moodId: MoodId) {
    setSelectedMood(moodId);
    // onClose fires immediately after; editor now shows body input
  }

  function handleMoodSheetClose() {
    setMoodSheetOpen(false);
  }

  function handleCancelInitial() {
    // No mood chosen — navigate back to calendar
    router.back();
  }

  return (
    <>
      {/* Editor body (rendered behind sheet when open) */}
      <MoodPickerSheet
        open={moodSheetOpen}
        date={date}
        mode="initial"
        onSelect={handleMoodSelect}
        onClose={handleMoodSheetClose}
        onCancelInitial={handleCancelInitial}
      />
    </>
  );
}
```

### Example 2 — `mode='change'` (user re-taps mood to change it)

```tsx
import { MoodPickerSheet } from '@/design-system/MoodPickerSheet';
import type { MoodId } from '@/lib/storage';

interface EditorMoodChangeProps {
  date: string;
  currentMood: MoodId;
  open: boolean;
  onClose: () => void;
  onMoodChanged: (moodId: MoodId) => void;
}

export function EditorMoodChange({
  date, currentMood, open, onClose, onMoodChanged,
}: EditorMoodChangeProps) {
  return (
    <MoodPickerSheet
      open={open}
      date={date}
      mode="change"
      selectedMoodId={currentMood}
      onSelect={onMoodChanged}
      onClose={onClose}
      // onCancelInitial omitted — not needed in 'change' mode
    />
  );
}
```

---

## Caller Invariants

Callers (REQ-009's editor and any future consumer) must observe all of the following:

1. **Single component, not two.** Both trigger paths (auto-open on new entry, re-tap on existing entry) must use the same `MoodPickerSheet` component and differ only in props. Splitting into two separate components violates PRD §4.2.1.

2. **`selectedMoodId` is meaningful only in `mode='change'`.** When `mode='initial'` callers must omit `selectedMoodId` (pass `undefined` or omit the prop). Passing a value in `'initial'` mode produces no runtime error but is semantically incorrect.

3. **`onCancelInitial` must be provided in `mode='initial'`** when the caller needs to navigate back or revert state on cancel. Omitting it with `mode='initial'` is syntactically allowed (optional prop) but results in a silent no-op cancel — the caller's UI may be left in an inconsistent state.

4. **`onCancelInitial` must be omitted (or `undefined`) in `mode='change'`.** The prop is optional; callers in `'change'` mode should not pass it to avoid confusing code reading. Passing it does not cause a bug (the component never calls it in `'change'` mode) but signals intent incorrectly.

5. **`onClose` must always be provided.** It is not optional. The caller is responsible for setting `open` to `false` (or unmounting) inside its `onClose` implementation; the component itself does not manage `open` state.

6. **Do not call `router.back()` inside `onSelect`.** Mood selection is a commit, not a cancel. Navigation belongs in `onCancelInitial` (for the no-mood cancel path) and is REQ-009's responsibility, not this component's.

7. **`date` must be a valid ISO `'YYYY-MM-DD'` string.** Do not pass a `Date` object, a display string (e.g. `'2026.05.17'`), or a datetime string with time or timezone components. Pass the `DiaryEntry.date` field directly.

8. **Do not add `disabled` to inactive tab buttons.** The contract requires inactive tabs to remain pointer-event-capable so that the "곧 만나요!" Toast fires. This constraint is internal to the component but callers must not attempt to override tab state via prop (no such prop is defined).

9. **Do not pass non-`MoodId` strings as `selectedMoodId`.** TypeScript enforces this, but callers using type assertions (`as MoodId`) must ensure the value is one of the 10 literal members. An unrecognized ID causes no highlight to render and no error — the behavior is silently incorrect.

10. **`open` is controlled state managed by the caller.** The component does not manage its own open state. The caller must set `open={false}` in its `onClose` handler; failing to do so leaves the sheet permanently visible.

11. **`onSelect` must not block or throw.** The component calls `onClose()` synchronously after `onSelect(moodId)`. If `onSelect` throws, `onClose()` is not reached and the sheet stays open. Callers should handle errors internally.

12. **Do not destructure `MoodPickerSheetProps` into two separate prop objects.** The component's props are a single interface; spread-merging two objects to produce props is fragile when `mode` and `onCancelInitial` are in different object literals.

---

## Implementation Notes for Backend

None. There is no backend involvement. No API routes, server actions, database reads/writes, or external service calls are associated with `MoodPickerSheet`.

---

## Implementation Notes for Frontend

### File location

`src/design-system/MoodPickerSheet.tsx` — registered in the design system on first appearance per CLAUDE.md's reuse rules, even though REQ-009 is the only known caller today.

### Dependency resolution

All imports are already in place from prior REQs:

| Import | Source |
|---|---|
| `type MoodId` | `@/lib/storage` (barrel re-exports from `src/lib/storage/types.ts`) |
| `MOODS` | `@/design-system/moods` |
| `BottomSheet` | `@/design-system/BottomSheet` |
| `Toast` | `@/design-system/Toast` |
| `useToast` | `@/design-system/useToast` |
| `IconButton` | `@/design-system/IconButton` |
| `MoodIcon` | `@/design-system/MoodIcon` |

### Critical implementation details

- **`"use client"` directive** — first line of file. Required; component uses `useState` (via `useToast`), `onClick` handlers, and `useDialogControl` chain.
- **`new Date(date + 'T00:00:00')`** — always append local-time sentinel; never `new Date(date)` (UTC midnight bug).
- **Toast placement** — `<Toast>` must be the last child in the fragment passed to `<BottomSheet>`. Being inside the `<dialog>` DOM subtree ensures it appears above the sheet in the top-layer stacking context. Pass `className="!bottom-6 left-1/2 -translate-x-1/2"` to override the component's default `fixed bottom-24` positioning for in-sheet use.
- **Inactive tab pointer events** — do NOT set `disabled` or `pointer-events-none` on "테마" / "일상" buttons. They must fire `onClick` to trigger the toast.
- **Selected mood highlight** — `ring-2 ring-peach bg-peach-light/30` on the matching cell. Use only peach tokens, never the mood's own `color` field (achromatic UI rule).
- **MOODS iteration** — render cells via `MOODS.map(mood => ...)` in array order (joy → embarrassed). Never hardcode emoji, labels, or IDs locally in this file.
- **Tab strip** — both rows are stateless in v1. Active styling is static CSS. No `useState` for tab selection. This is intentional; v2 will add state when "테마" and "일상" become active.
- **`handleCancel`** — single internal function; all three close paths (X button `onClick`, backdrop via `BottomSheet.onClose`, Escape via `BottomSheet.onClose`) must invoke it. Mood tap must bypass it entirely.

### Test file

`src/design-system/__tests__/MoodPickerSheet.test.tsx`

Required test setup:
```ts
// @vitest-environment happy-dom

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
```

Minimum 10 test cases as specified in the technical design (open/close, header text, mood grid count, mood tap callbacks, X-button callbacks for both modes, inactive tab toast, selected mood highlight classes, source-guard `"use client"`).

---

## Verdict
PASS
