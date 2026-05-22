# Architecture Report — REQ-011

## Summary

REQ-011 (사진 추가 / 카로젤 / 길게 누름 삭제) adds photo attachment to the diary editor. The existing codebase has all prerequisites in place: the `Photo` type is fully defined, `DiaryEntry.photos: Photo[]` exists, `EditorToolbar` has an `onGalleryTap` stub, `generateId` is exported from `@/lib/storage`, and the autosave/save pipeline flows through `useEditorState` + `useAutosave` + `saveFn`. The critical gap is that `useEditorState` has no `photos` field and `saveFn` currently hardcodes `photos: []`. All four files that will be modified are at or above the 100-line budget.

---

## Codebase Map (paths reviewed)

- `src/lib/storage/types.ts` — `Photo`, `DiaryEntry`, all types
- `src/lib/storage/index.ts` — public API, exports `MAX_PHOTO_DATAURL_BYTES`, `MAX_PHOTOS_PER_ENTRY`
- `src/lib/storage/limits.ts` — capacity constants
- `src/lib/storage/diaries.ts` — `upsertDiary`, `readDiaries`, `removeDiary`
- `src/lib/storage/uuid.ts` — `generateId`
- `src/lib/storage/__tests__/fixtures.ts` — `makeDiary`, `makeConversation`
- `src/lib/hooks/useEditorState.ts` — reducer, `EditorState`, `EditorAction`
- `src/lib/hooks/useAutosave.ts` — autosave debounce hook
- `src/lib/hooks/useHorizontalDatePicker.ts` — date strip hook
- `src/app/diary/[date]/_components/Editor.tsx` — main editor component
- `src/app/diary/[date]/_components/EditorToolbar.tsx` — toolbar with gallery stub
- `src/app/diary/[date]/_components/EditorBody.tsx` — mood header + textarea
- `src/app/diary/[date]/_components/HorizontalDatePicker.tsx` — scroll-snap strip
- `src/design-system/useToast.ts` — `show(message, durationMs?)` / `hide()`
- `src/design-system/Toast.tsx` — `role?: 'status' | 'alert'`
- `src/design-system/useDialogControl.ts` — dialog open/close
- `e2e/_helpers/seedDiaries.ts` — E2E seed helper
- `vitest.config.ts` — `environment: 'node'`, no happy-dom default
- `package.json` — Next 15 / React 19 / Vitest / Playwright

---

## Findings on Each Numbered Topic

### 1. `Photo` type — confirmed exact fields

`src/lib/storage/types.ts` lines 78–87:
```
id: string        // UUID from generateId()
dataUrl: string   // base64 data URL
width: number
height: number
addedAt: string   // ISO 8601
```
Matches intake exactly. No deviation.

### 2. `DiaryEntry.photos`

Line 108 of `types.ts`: `photos: Photo[]`. It is `Photo[]`, not `string[]`. `fixtures.ts` initialises it as `photos: []`. Confirmed.

### 3. `EditorToolbar` — gallery button shape

`EditorToolbar.tsx` lines 47–53: `EditorToolbarProps` has `onGalleryTap: () => void`. The gallery button (lines 69–76) is wired to that prop. It has no `disabled` prop, no `photoCount` prop. The button has `aria-label="갤러리"`, `min-h-[44px] min-w-[44px]`, `text-meta` — exactly the touch-target pattern required. REQ-011 needs to add `disabled?: boolean` and `photoCount?: number` (or `galleryDisabled?: boolean`) to `EditorToolbarProps`.

### 4. `Editor.tsx` integration

Line 150–152: `onGalleryTap={() => toast.show('곧 만나요!')}` — currently a placeholder toast. The hidden `<input type="file">` does not exist. Photos are not in `Editor`'s local state — they would need to be part of `useEditorState` or managed via `ADD_PHOTO`/`DELETE_PHOTO` dispatch actions, with `state.photos` passed down.

`autosaveValue` (lines 41–44) is `{ mood, text, textAlign }` — photos are absent. This is the primary wiring gap.

`saveFn` (lines 47–58): `photos: []` is hardcoded on line 54. This must become `photos: state.photos` (or `v.photos` if photos are included in `autosaveValue`).

### 5. `useEditorState` — photos absent

`EditorState` (lines 7–18) has no `photos` field. `EditorAction` union (lines 21–32) has no `ADD_PHOTO` or `DELETE_PHOTO`. `LOAD_ENTRY` reducer (lines 52–69) destructures `{ id, createdAt, mood, text, textAlign }` from the entry — `photos` is discarded. `MARK_SAVED` snapshot (lines 79–85) captures `{ mood, text, textAlign }` — no photos.

Required additions to `useEditorState.ts`:
- `EditorState.photos: Photo[]`
- `EditorAction: | { type: 'ADD_PHOTO'; photo: Photo } | { type: 'DELETE_PHOTO'; id: string }`
- `LOAD_ENTRY` case: spread `entry.photos ?? []` into state
- `MARK_SAVED` case: snapshot does not need photos (snapshot is used only for dirty detection of text/mood/align)
- `INITIAL_STATE.photos: []`
- Import `Photo` from `@/lib/storage`

### 6. `saveFn` in `Editor.tsx`

Line 54: `photos: []`. Must change to `photos: state.photos`. Note: `saveFn` captures `state.persistedId`, `state.persistedCreatedAt`, `currentDate` in its dependency array (line 58). After adding `state.photos`, it must also be in the dep array or the save will use a stale photos reference.

Two implementation options:
- Option A: add `photos` to `autosaveValue` shape (then `v.photos` in the callback) — requires changing `AutosaveValue` type used in `useHorizontalDatePicker.ts` too
- Option B: keep `autosaveValue` as `{mood, text, textAlign}` and add `state.photos` directly to `saveFn` closure deps — simpler, no `useHorizontalDatePicker` interface change

Option A is preferred for correctness — see Constraint 3 below.

### 7. `useToast` — signature and role support

`useToast.ts` lines 40–45: `show(message: string, durationMs = 1800): void`. No role parameter — role is on `<Toast role>` prop, not on `show()`. `Toast.tsx` line 26: `role?: 'status' | 'alert'`. The current `Editor.tsx` only mounts one `<Toast>` with no role override (defaults to `'status'`). For error toasts ("파일이 너무 큽니다"), passing `role="alert"` is accessible — but the current architecture does not allow per-call role switching through `useToast`. Either: mount a second `<Toast role="alert">` for error cases, or accept that the existing single toast with default `role="status"` is used for all messages (permissible for MVP).

### 8. `autosaveValue` — photos not included

As noted in §4 and §6, `autosaveValue` (line 41–44 of `Editor.tsx`) does not include photos. Photo changes will not trigger the `useAutosave` debounce. The cleanest fix is to add `photos: Photo[]` to `autosaveValue` and update `AutosaveValue` in `useHorizontalDatePicker.ts` accordingly — that type only carries `mood | text | textAlign` now and the hook only passes it to `saveFn`, so the addition is non-breaking.

### 9. `generateId` — confirmed

`src/lib/storage/uuid.ts` line 20: `export function generateId(): string` using `crypto.randomUUID()`. Exported via `@/lib/storage` index line 42. Ready to import in the new `photoBase64.ts` utility.

### 10. Horizontal scroll patterns — reuse

`HorizontalDatePicker.tsx` (lines 41–46): `overflow-x: auto; scrollSnapType: 'x mandatory'; WebkitOverflowScrolling: 'touch'; gap: 4; no-scrollbar class`. `DateCell.tsx` (lines 50, 58): `scroll-snap-align-center` Tailwind class and `scrollSnapAlign: 'center'` inline style. The carousel should use `overflow-x: auto; scroll-snap-type: x mandatory` with `scroll-snap-align: start` per Invariant 8 in intake. The `no-scrollbar` utility class already exists on the project's Tailwind config (used in `HorizontalDatePicker`) — can be reused on `PhotoCarousel`.

### 11. `useDialogControl` — backdrop tap

`useDialogControl.ts` uses `<dialog>` backdrop detection. This is for modal dialogs. The delete overlay on photo thumbnails is an inline overlay rendered within the carousel, not a `<dialog>`. Tap-outside dismissal for the overlay should use a `pointerdown` listener on `document` that checks `!ref.current?.contains(e.target)`, not `useDialogControl`. No existing hook covers this pattern.

### 12. Long-press hooks — none exist

Zero results for `longPress`, `touchstart`, `pointerdown` in source. `useLongPress.ts` must be created from scratch in `src/lib/hooks/`.

### 13. `navigator.vibrate` in tests

Vitest runs in `environment: 'node'` by default (`vitest.config.ts` line 4). Files using `// @vitest-environment happy-dom` get the happy-dom DOM APIs. In happy-dom, `navigator.vibrate` is not implemented (returns `undefined`). The intake's required feature-detect `if (navigator.vibrate) navigator.vibrate(50)` will be silently skipped in tests — no stub needed. In Playwright Chromium, `navigator.vibrate` exists and returns `true` without actually vibrating (the API is present but the browser silently ignores it). No special handling needed.

### 14. File-size status

| File | Current lines | After REQ-011 change |
|---|---|---|
| `Editor.tsx` | 192 | +30–50 (file input ref, photo dispatch wiring) → ~230 |
| `EditorToolbar.tsx` | 108 | +5–10 (disabled prop, photoCount prop) → ~115 |
| `useEditorState.ts` | 110 | +20–30 (photos field, ADD_PHOTO, DELETE_PHOTO) → ~135 |
| `EditorBody.tsx` | 122 | +5 (PhotoCarousel slot) → ~127 |

All are already over the 100-line budget. The new code (`PhotoCarousel`, `useLongPress`, `photoBase64`) must live in separate files — not folded into any of these.

### 15. `Image()` dimensions extraction in happy-dom

`new Image()` exists in happy-dom but `naturalWidth`/`naturalHeight` are always `0` unless the environment actually decodes image data (it doesn't). Unit tests for `photoBase64.ts` must mock the `Image` load cycle. Recommended pattern: in tests, replace `Image` with a class that fires `onload` synchronously and returns fixed dimensions. The utility function should accept an injectable `ImageConstructor` param or the test can mock `globalThis.Image`. In Playwright E2E, real Chromium decodes the image properly so `naturalWidth`/`naturalHeight` work.

---

## Concrete Integration Points

| File | Change |
|---|---|
| `src/lib/hooks/useEditorState.ts` | Add `photos: Photo[]` to `EditorState`; add `ADD_PHOTO` / `DELETE_PHOTO` to `EditorAction`; update `LOAD_ENTRY` to spread `entry.photos`; INITIAL_STATE.photos: [] |
| `src/app/diary/[date]/_components/Editor.tsx` | Change `photos: []` to `photos: state.photos` in `saveFn`; add `state.photos` to `saveFn` dep array; add `photos: state.photos` to `autosaveValue`; replace `onGalleryTap` placeholder with file-input wiring; mount `<PhotoCarousel>` between EditorBody and EditorToolbar |
| `src/app/diary/[date]/_components/EditorToolbar.tsx` | Add `disabled?: boolean` (gallery button) and `photoCount?: number` props |
| `src/app/diary/[date]/_components/EditorBody.tsx` | No change needed — carousel mounts in `Editor.tsx` between `<EditorBody>` and `<EditorToolbar>` |
| `src/lib/hooks/useHorizontalDatePicker.ts` | Add `photos: Photo[]` to `AutosaveValue` type — see Constraint 3 |
| `src/lib/storage/index.ts` | Already exports `MAX_PHOTO_DATAURL_BYTES`, `MAX_PHOTOS_PER_ENTRY` — no change needed |

---

## Architecture Constraints

1. `upsertDiary` does not catch `QuotaExceededError` — it propagates. `saveFn` in `Editor.tsx` also does not currently catch it. REQ-011 must add a try/catch around `upsertDiary` in `saveFn` (or in `useAutosave`) and call `toast.show('저장에 실패했어요...')`. This is a pre-existing gap that REQ-011's larger photos make urgent.

2. The Vitest environment is `node` by default. Components using `useEditorState` (which calls `readDiaries` / `localStorage`) override to `// @vitest-environment happy-dom` at the file level. `useLongPress.ts` tests will need `// @vitest-environment happy-dom` for pointer event simulation.

3. `AutosaveValue` in `useHorizontalDatePicker.ts` is a shared type. If photos are added to it, the `handleDateSelect` callback passes `autosaveValue` (including photos) to `saveFn`, which is correct — the photos at the time of date-switch will be saved. This is the right behavior.

4. The `MARK_SAVED` action currently snapshots `{ mood, text, textAlign }` for dirty detection. Photos are not tracked in the snapshot. This is acceptable: `isDirty` in `Editor.tsx` only checks text/mood/align. Photos flow through the save but are not part of dirty-flag logic — photo adds/deletes go directly to `upsertDiary` via autosave without needing a separate dirty signal.

---

## Risks Specific to This Architecture

1. **base64 + localStorage 5 MB limit**: `limits.ts` sets `MAX_PHOTO_DATAURL_BYTES = 150 * 1024` (150 KB per image). However, the intake's REQ says to reject files where `file.size > 5_242_880`. A 5 MB file encodes to ~6.7 MB base64 — the per-file limit in `limits.ts` (150 KB base64) is much stricter than the intake's 5 MB file cap. These two limits are **inconsistent**. Implementation must choose one: the `limits.ts` constant (150 KB dataUrl string length) or the intake's 5 MB file size cap. Both must be enforced in the `photoBase64.ts` utility; the stricter dataUrl length check should be primary.

2. **`Image()` + `naturalWidth`/`naturalHeight` in happy-dom**: Returns 0/0 unless mocked. Tests for `photoBase64.ts` must inject a mock Image constructor. This is not difficult but is easy to forget.

3. **Long-press vs scroll on carousel**: `pointerdown` starts the 500 ms timer; `pointermove` must cancel it if displacement exceeds 5 px. Without the move-slop check, normal horizontal scrolling will trigger the delete overlay on every thumbnail. The `useLongPress` hook must track `startX/startY` from `pointerdown` and cancel on `pointermove` beyond threshold.

4. **`saveFn` does not catch `QuotaExceededError`**: Current code will throw an unhandled exception if storage is full. With photos, this becomes much more likely. Must wrap `upsertDiary` in try/catch.

5. **Multiple rapid gallery taps**: No `isProcessing` guard exists. FileReader's `onload` fires asynchronously, and a second tap before the first resolves opens another file dialog. A `useRef<boolean>` flag in the gallery tap handler is needed.

6. **`useHorizontalDatePicker.AutosaveValue` type coupling**: If photos are added to `AutosaveValue`, any future REQ that adds a new field to `autosaveValue` must also update this type. The coupling is mild but documented.

7. **`navigator.vibrate` in Playwright**: Available in Chromium desktop (returns `true`, silently no-ops). Will not block E2E tests. Safe.

---

## Suggested Component / File Structure for the New Feature

```
src/
  lib/
    hooks/
      useLongPress.ts                   # NEW: pointer-event long-press hook
      useLongPress.test.ts              # NEW: happy-dom, fake timers
  app/
    diary/[date]/
      _components/
        PhotoCarousel.tsx               # NEW: carousel + per-thumbnail overlay
        PhotoCarousel.test.tsx          # NEW: add/delete/overlay/empty-hide
  lib/
    storage/
      photoBase64.ts                    # NEW: FileReader util + size check
      photoBase64.test.ts               # NEW: mock Image + FileReader
```

Files modified (not created):
- `src/lib/hooks/useEditorState.ts` — add `photos`, `ADD_PHOTO`, `DELETE_PHOTO`
- `src/app/diary/[date]/_components/Editor.tsx` — wire photos into autosave + saveFn + mount carousel
- `src/app/diary/[date]/_components/EditorToolbar.tsx` — add `disabled` / `photoCount` props

Note: `photoBase64.ts` belongs under `src/lib/storage/` alongside `uuid.ts` and `limits.ts` because it is a storage-layer concern (encodes + validates before calling `upsertDiary`). Alternatively it can live in a new `src/lib/photo/` module — either is acceptable. The storage sub-path is simpler given existing patterns.

---

## File Budget Warnings

All four files being modified are already over the 100-line rule:

| File | Lines now | Projected after REQ-011 | Action |
|---|---|---|---|
| `Editor.tsx` | 192 | ~230 | Extract photo-related handler functions into a `usePhotoHandlers` hook or inline in the new file; at minimum, move file-input JSX to a sub-component `GalleryInput.tsx` |
| `EditorToolbar.tsx` | 108 | ~115 | Minor, acceptable if gallery props are 2–3 lines; split SVG icons into separate file if needed |
| `useEditorState.ts` | 110 | ~135 | Move the reducer function out to `editorReducer.ts`, keep hook in `useEditorState.ts` |
| `EditorBody.tsx` | 122 | ~127 | Minor; no split required this REQ but flagged for next |

The new files should be sized from the start within budget:
- `PhotoCarousel.tsx` — target <90 lines (thumbnails + overlay only, no FileReader logic)
- `useLongPress.ts` — target <40 lines
- `photoBase64.ts` — target <60 lines

---

## Verdict
PASS

All architectural dependencies are in place and verified. The primary integration gaps — `state.photos` missing from `useEditorState`, `photos: []` hardcoded in `saveFn`, and photos absent from `autosaveValue` — are clearly located and have straightforward fixes. No unknown subsystems. File-size violations are pre-existing and manageable through the proposed extractions.
