# Architecture Report — REQ-009

## Summary

REQ-009 delivers the diary editor — a single "use client" screen component that handles both new-entry creation and existing-entry editing without branching into separate routes or components. The route stub at `/Users/jay/Documents/Projects/ai_diary/src/app/diary/[date]/page.tsx` is a Next.js 15 async server component that validates the date param and renders a placeholder; REQ-009 replaces it with a real client component tree. Every primitive it needs — storage functions, design-system components, navigation constants — is confirmed present. No forward dependencies are blocked.

---

## Frontend Findings

### Stack confirmation

Confirmed from `package.json`:

- Next.js 15.5.18
- React 19.0.0 / react-dom 19.0.0
- Tailwind CSS 4.x (`@tailwindcss/postcss ^4.0.0`, `tailwindcss ^4.0.0`)
- TypeScript 5.x (`strict: true` in `tsconfig.json`)
- Vitest 2.x (`vitest ^2.0.0`)
- `@testing-library/react ^16.3.2` + `happy-dom ^20.9.0`
- `@playwright/test ^1.44.0`

### Route file — current state

Path: `/Users/jay/Documents/Projects/ai_diary/src/app/diary/[date]/page.tsx`

It is a **server component** (no `"use client"` directive). The params are consumed with the Next.js 15 async-params pattern:

```ts
interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryPage({ params }: PageProps) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  return (
    <main className="px-6 py-8 text-charcoal">
      <h1 className="text-3xl">{date} 일기</h1>
      <p className="mt-2 text-meta">REQ-009에서 채워집니다.</p>
    </main>
  );
}
```

The `await params` pattern is already correct for Next.js 15. REQ-009 will keep `DiaryPage` as an async server component that passes the validated `date` down to a `"use client"` `<Editor date={date} />` child. The date validation regex stays in the server component.

**Important path discrepancy**: The REQ-009 intake and previous agent-state files referenced `src/app/(routes)/diary/[date]/page.tsx` (a route group). The actual path is `src/app/diary/[date]/page.tsx` (no route group). All sub-component paths must use the actual path: `src/app/diary/[date]/_components/`.

### Storage hooks — `useDiaryByDate` does not exist

`/Users/jay/Documents/Projects/ai_diary/src/lib/storage/useDiaries.ts` exposes only:

```ts
export function useDiaries(): { entries: DiaryEntry[]; isReady: boolean }
```

There is **no `useDiaryByDate(date)` hook and no `getDiaryByDate` function** exported from `@/lib/storage`. The public API in `index.ts` exports only `readDiaries`, `writeAllDiaries`, `upsertDiary`, `removeDiary`.

Recommended approach for the editor: inside a `"use client"` `useEditorState` hook, call `readDiaries()` in a `useEffect` on mount and filter by `date` (exactly as `CalendarScreen` does via `useDiaries` + a `Map`). This is the lightest path — no new hook needed, and it follows the established `isReady` hydration-guard pattern.

### Storage function signatures

From `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/diaries.ts`:

```ts
export function readDiaries(): DiaryEntry[]
export function upsertDiary(entry: DiaryEntry): void
export function removeDiary(id: string): void   // keyed on id, NOT date
```

`upsertDiary` enforces 1-per-day by a two-step dedup: id-match takes precedence, then date-match. Both replace in-place.

`removeDiary` is keyed on **`DiaryEntry.id`**, not on `date`. The editor must track the loaded entry's `id` so it can call `removeDiary(entry.id)`.

There is no `deleteDiary(date)` function. The intake document refers to it as `deleteDiary` — the actual name is `removeDiary` and it takes `id`. This is a naming discrepancy the technical design must note explicitly.

### `DiaryEntry` type — `textAlign` already present

From `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/types.ts`:

```ts
export interface DiaryEntry {
  id: string;
  date: string;
  mood: MoodId;
  text: string;
  textAlign: 'left' | 'center';
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
}
```

`textAlign` is already a **required** field (not optional). The fixtures factory at `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/__tests__/fixtures.ts` already populates it with `'left'`. This means:

1. No schema extension needed for `DiaryEntry`.
2. Old entries that pre-date this field definition are not a real concern since all test fixtures already include it. However, because `textAlign` is **required** (not `textAlign?`), any old localStorage data lacking this field would produce `undefined` at runtime even though TypeScript marks it non-optional. The editor should default to `'left'` when reading `entry.textAlign` in case of legacy data.

The body field in `DiaryEntry` is named `text`, not `body`. The technical design must align all references to `entry.text` (not `entry.body`).

### `MoodPickerSheetProps` — confirmed interface

From `/Users/jay/Documents/Projects/ai_diary/src/design-system/MoodPickerSheet.tsx`:

```ts
export interface MoodPickerSheetProps {
  open: boolean;
  date: string;
  selectedMoodId?: MoodId;
  mode: 'initial' | 'change';
  onSelect: (moodId: MoodId) => void;
  onClose: () => void;
  onCancelInitial?: () => void;
}
```

`MoodPickerSheet` is 129 lines and already contains an inline `MoodPickerTabs` sub-component. The NB-2 carry-forward from REQ-008 (extract `MoodPickerTabs`) is still open but not blocking.

### Back navigation pattern

`CalendarScreen` uses `useRouter` from `next/navigation` directly and calls `router.push(Routes.diary(date))` on cell tap. There is **no `useRouterBack` helper** in the codebase — back navigation is done with `router.back()` from `next/navigation` inline wherever needed. The editor should do the same.

### Tailwind tokens available

From `/Users/jay/Documents/Projects/ai_diary/src/app/globals.css` `@theme` block, confirmed tokens:

- `bg-cream` (`#FAF6EE`), `bg-paper` (`#FFFFFF`), `bg-charcoal` (`#2A2A2A`)
- `text-charcoal`, `text-meta`, `text-cell-empty`
- `bg-peach` (`#F5C896`), `bg-peach-dark`, `bg-peach-light`
- `bg-danger` (`#C53030`)
- `bg-success` (`#B4E4B4`)
- All 10 mood pastel colors: `bg-mood-joy`, `bg-mood-love`, etc.
- `--radius-card: 16px`, `--radius-card-lg: 20px`, `--shadow-card`
- `--container-mobile: 420px`

Missing token for the editor: there is no `bg-toolbar` or `border-divider` token. The toolbar background will need to use `bg-paper` or `bg-cream` from existing tokens. No new token is strictly required.

### `ConfirmDialog` — no `title` prop

`ConfirmDialog` has: `open`, `message`, `onConfirm`, `onCancel`, `confirmLabel?`, `cancelLabel?`, `destructive?`, `className?`. There is **no `title` prop**. The intake's recommended dialog copy (e.g. "저장되지 않은 변경사항이 있어요") must be embedded in `message` rather than a separate title field, or `ConfirmDialog` must be extended to add a `title?` prop. This is a design decision the technical design phase must resolve.

---

## Backend Findings

None. This REQ uses localStorage only via `@/lib/storage` imperatives. No server-side routes, API calls, or edge functions are involved.

---

## Data Model Findings

### `textAlign` — already in schema, required not optional

`DiaryEntry.textAlign` is already `'left' | 'center'` (required). No migration or type change is needed. However, since localStorage data from before REQ-009 was built could technically have entries without the field, the editor should read `entry.textAlign ?? 'left'` defensively at runtime even though TypeScript will not flag it.

### 1-per-day enforcement confirmed

`upsertDiary` in `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/diaries.ts` uses two-step dedup (id-match, then date-match). The call with the same `date` and a different `id` will overwrite the existing entry. This means the editor can create a new `DiaryEntry` with a fresh `generateId()` id each time and still be safe — the date-match step will prevent duplicates.

### Delete is `removeDiary(id: string)` — not `deleteDiary(date)`

The intake document uses the name `deleteDiary` in several places. The actual exported function is `removeDiary(id: string)`. The editor must load and retain the existing entry's `id` from storage to call delete correctly. For a new entry that has never been saved, delete should not be reachable (it is hidden when no saved record exists).

---

## Test Structure Findings

### Vitest patterns

- Default environment: `node`. Per-file override via `// @vitest-environment happy-dom` at file top (used in every component test and hook-render test).
- Global setup: `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/__tests__/setup.ts` — installs `LocalStorageShim` on `globalThis` and `globalThis.window`, resets via `localStorage.clear()` in `beforeEach`.
- Storage tests do **not** need happy-dom because they do not render React — they rely on the `LocalStorageShim` from setup.ts.
- Component/hook tests: `// @vitest-environment happy-dom`, import `render`, `screen`, `fireEvent`, `cleanup`, `act` from `@testing-library/react`. `cleanup()` in `afterEach`.
- Timer faking: `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach` (used in `MoodPickerSheet.test.tsx` and `useToast.test.ts`).
- `<dialog>` in happy-dom: `showModal` and `close` are not implemented natively; tests mock them via `HTMLDialogElement.prototype.showModal = vi.fn()` / `HTMLDialogElement.prototype.close = vi.fn()` in `beforeEach`, restored in `afterEach`.
- `next/navigation` mocking: `vi.mock('next/navigation', () => ({ ... }))` using helpers from `/Users/jay/Documents/Projects/ai_diary/src/lib/navigation/__tests__/setupNextNavigation.ts`. The helper exports `mockRouter` (with `back`, `push`, `replace`, `prefetch`, `refresh`, `forward` as `vi.fn()`), `mockNotFound`, and `resetNavigationMocks()`.
- Module imports are done **after** `vi.mock` calls (dynamic `await import(...)`) when the module has internal state that must be seeded before first render.

### Playwright patterns

- Config: `/Users/jay/Documents/Projects/ai_diary/playwright.config.ts` — Chromium only, `baseURL: 'http://localhost:3000'`, `webServer` auto-starts `npm run dev`, `reuseExistingServer: !process.env.CI`.
- Test file: `/Users/jay/Documents/Projects/ai_diary/e2e/calendar.spec.ts` — one test, exercises FAB click → URL navigation. Uses `page.goto('/')`, `page.getByRole`, `page.getByText`, `expect(page).toHaveURL(...)`.
- No localStorage seeding pattern is established yet in E2E. The editor E2E flow will need to either seed via `page.evaluate(() => localStorage.setItem(...))` before navigation or navigate through the real UI to write data.

---

## Tooling and Commands

From `package.json` scripts:

```
npm run dev          # next dev
npm run build        # next build
npm run start        # next start
npm run lint         # next lint (ESLint)
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (single-pass)
npm run test:watch   # vitest (watch mode)
npm run test:e2e     # playwright test
npm run test:e2e:install  # playwright install chromium
```

---

## Existing Patterns to Reuse

| Primitive | File |
|---|---|
| `DiaryEntry`, `MoodId`, `Photo` types | `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/types.ts` |
| `readDiaries`, `upsertDiary`, `removeDiary`, `generateId` | `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/diaries.ts` (via `@/lib/storage`) |
| `useDiaries` (isReady pattern) | `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/useDiaries.ts` |
| `Routes.diary(date)`, `Routes.list` | `/Users/jay/Documents/Projects/ai_diary/src/lib/navigation/routes.ts` |
| `BottomSheet` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/BottomSheet.tsx` |
| `ConfirmDialog` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/ConfirmDialog.tsx` |
| `Toast` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/Toast.tsx` |
| `useToast` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/useToast.ts` |
| `useDialogControl` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/useDialogControl.ts` |
| `IconButton` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/IconButton.tsx` |
| `MoodIcon` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/MoodIcon.tsx` |
| `MoodPickerSheet`, `MoodPickerSheetProps` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/MoodPickerSheet.tsx` |
| `MOODS`, `MOOD_MAP` | `/Users/jay/Documents/Projects/ai_diary/src/design-system/moods.ts` |
| `setupNextNavigation` helpers | `/Users/jay/Documents/Projects/ai_diary/src/lib/navigation/__tests__/setupNextNavigation.ts` |
| `makeDiary` fixture factory | `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/__tests__/fixtures.ts` |
| `LocalStorageShim` + setup | `/Users/jay/Documents/Projects/ai_diary/src/lib/storage/__tests__/setup.ts` |
| `isReady` hydration guard pattern | Established in `useDiaries` and consumed in `CalendarScreen` |
| `HTMLDialogElement.prototype.showModal` mock pattern | Established in `BottomSheet.test.tsx`, `ConfirmDialog.test.tsx`, `MoodPickerSheet.test.tsx` |

---

## Files Likely to Change

### Modified
- `/Users/jay/Documents/Projects/ai_diary/src/app/diary/[date]/page.tsx` — replace stub body with `<Editor date={date} />` render; keep async server component shell and date validation.

### New (route-scoped)
- `src/app/diary/[date]/_components/Editor.tsx` — container; wires state, storage, navigation.
- `src/app/diary/[date]/_components/EditorHeader.tsx` — back `IconButton` + `⋯` `IconButton`.
- `src/app/diary/[date]/_components/EditorBody.tsx` — mood area + date label + `<textarea>`.
- `src/app/diary/[date]/_components/EditorToolbar.tsx` — bottom icon strip (gallery noop, align toggle, time insert, conditional save).
- `src/app/diary/[date]/_components/EditorMoreMenu.tsx` — `BottomSheet` with list/delete items.
- `src/app/diary/[date]/_components/UnsavedChangesDialog.tsx` — `ConfirmDialog` wrapper for dirty-state guard.

### New (shared hooks)
- `src/lib/hooks/useAutosave.ts` — `useAutosave(value, delayMs, saveFn)` with debounce.
- `src/lib/hooks/useEditorState.ts` — `useReducer`-based state for `mood`, `text`, `textAlign`, `isDirty`, and UI open-states.

### New (tests)
- `src/app/diary/[date]/__tests__/Editor.test.tsx` — four entry-context initial states, autosave debounce, explicit-save toast, back-nav guard.
- `src/lib/hooks/__tests__/useAutosave.test.ts` — debounce timing, cleanup on unmount.
- `e2e/editor.spec.ts` — end-to-end flow: empty cell → mood select → body input → autosave → back → calendar shows mood.

### Possibly modified (carry-forwards from REQ-008)
- `/Users/jay/Documents/Projects/ai_diary/src/design-system/MoodPickerSheet.tsx` — NB-2: extract `MoodPickerTabs` if adding integration lines pushes file over 100 lines further.
- `/Users/jay/Documents/Projects/ai_diary/src/design-system/useDialogControl.ts` — NB-1: Escape key on `BottomSheet` in `mode='initial'` may not trigger `onCancelInitial`. Implementer should verify and add a `cancel` event listener if needed.
- `/Users/jay/Documents/Projects/ai_diary/src/design-system/ConfirmDialog.tsx` — may need a `title?` prop if the intake's recommended dialog copy requires a separate header line (currently only `message` is rendered).

---

## Risks

1. **SSR/hydration mismatch in storage access.** `readDiaries()` calls `window.localStorage` which is not available during server render. The page component is a server component, so it cannot call `readDiaries()` directly — it must pass only the `date` string to a `"use client"` `Editor` child. Inside the editor, `readDiaries()` must be called inside `useEffect` (following the `useDiaries` + `isReady` pattern). Any attempt to read storage outside `useEffect` will return `[]` silently on SSR and produce a hydration mismatch flash.

2. **`removeDiary` takes `id`, not `date`.** The intake and requirements consistently call the function `deleteDiary(date)`, which does not exist. The actual function is `removeDiary(id: string)`. If the editor creates a new entry id on mount (before first save) and then the user taps delete immediately, the editor may call `removeDiary` with a stale or non-persisted id. The implementation must guard: delete is only reachable when a saved record exists (loaded from storage with a real persisted `id`).

3. **Debounce + back-navigation race condition.** If the user types and then taps back within the 1-second debounce window, the autosave has not yet fired. The `isDirty` guard fires the `UnsavedChangesDialog`. The "저장하고 나가기" path calls `upsertDiary` explicitly and then `router.back()`. But the still-pending debounce timer will fire 1 second later into an unmounted component. The `useAutosave` hook must cancel its timer in a `useEffect` cleanup, and `useEditorState` must also cancel the pending debounce on unmount.

4. **NB-1 Escape key gap in `MoodPickerSheet`.** `BottomSheet` claims Escape is handled by native `showModal()`, but `useDialogControl` does not attach a `cancel` event listener to call `onClose`. In `mode='initial'`, the user pressing Escape may close the native dialog without triggering `onCancelInitial`, which is supposed to call `router.back()`. If this fires silently, the user lands on a blank editor with no mood selected and no way to go back cleanly. This carry-forward must be verified and patched before or during REQ-009 integration.

5. **`DiaryEntry.textAlign` is required, not optional.** Old localStorage data from informal testing before this REQ may not have the field. Since TypeScript marks it required, `entry.textAlign` typed as `'left' | 'center'` will silently be `undefined` at runtime for legacy data. The editor's initial state derivation should use `entry.textAlign ?? 'left'` defensively.

6. **`MoodPickerSheet` auto-open on new entry — open state timing.** When the editor mounts for a new entry (no existing data), it must auto-open `MoodPickerSheet`. If the open state is set synchronously during render (e.g. `useState(true)`), it will attempt `showModal()` before the `<dialog>` ref is attached. The existing `useDialogControl` already defers `showModal()` to a `useEffect`, so this is safe — but the initial `open` state for the mood sheet must still be set with care (initialized to `true` for new entries, `false` for existing ones).

---

## Unknowns

1. **`ConfirmDialog` lacks a `title` prop.** The intake recommends dialog copy like `"저장되지 않은 변경사항이 있어요"` as a title, but `ConfirmDialog` only has `message` (body text). The technical design must decide: (a) put the full copy in `message` as a single string, (b) add a `title?` prop to `ConfirmDialog` and split the copy across title + message, or (c) create a new dialog component. Option (b) is cleanest but requires modifying an existing design-system file.

2. **`useEditorState` initial state shape for existing entry.** The editor loads the entry inside `useEffect`. Before the effect runs, the state is empty. Between mount and effect completion, the editor renders with empty fields. Is a loading skeleton needed, or is the flash acceptable? The existing `useDiaries` + `isReady` pattern suppresses rendering until `isReady`, but the editor needs to show something immediately (e.g. the textarea is present but empty). The design must define whether to suppress the entire editor until data is loaded, or accept a brief empty-fields flash.

3. **Textarea keyboard-avoidance strategy.** The intake mentions "CSS `resize: none` + scroll-padding." On mobile Safari and Chrome, `position: sticky` toolbars above the software keyboard require `window.visualViewport` event listeners or CSS `env(keyboard-inset-height)` (iOS 15+). The design must specify the exact implementation, as this is platform-specific and the existing codebase has no prior art for it.

4. **E2E localStorage seeding.** The E2E spec for the editor needs to test the "existing entry" entry context, which requires pre-seeding localStorage before navigating. No Playwright localStorage seeding pattern exists in `e2e/calendar.spec.ts`. The design must define how to seed data: `page.evaluate(() => localStorage.setItem(...))` before `page.goto('/diary/...')`, or navigating through the real new-entry flow first and then reloading.

5. **`MoodPickerSheet` Escape + `onCancelInitial` gap (NB-1).** Whether native dialog Escape fires `onCancelInitial` is unverified. This must be tested manually or with a targeted unit test against happy-dom before the editor's back-navigation guard can be considered complete.

6. **Toolbar sticky positioning when keyboard rises.** The design has not specified how the bottom toolbar attaches above the virtual keyboard. Options include `position: fixed; bottom: 0`, `env(safe-area-inset-bottom)`, or `visualViewport` resize listener. This is particularly important on iOS where the viewport does not shrink when the keyboard opens.

---

## Verdict
PASS
