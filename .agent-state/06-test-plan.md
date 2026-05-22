# Test Plan

## Summary

REQ-011 adds photo attachment to the diary editor via four layers: `addPhotoFromFile` (storage
utility), `useLongPress` (hook), `PhotoCarousel` (component), and editor wiring in
`useEditorState` + `Editor.tsx`. Tests are written bottom-up to match the implementation order.
All unit tests use Vitest 2; browser-DOM-dependent tests use `// @vitest-environment happy-dom`.
Two Playwright E2E cases cover the end-to-end save/reload round-trip and the disabled-gallery
guard.

**Total new cases: 28** (26 unit/integration + 2 E2E).
**Existing baseline: 237 unit + 4 E2E — must remain green.**

---

## Unit Tests

### 1. `src/lib/storage/__tests__/photoBase64.test.ts` — NEW (6 cases)

Environment: `// @vitest-environment happy-dom`

| ID | Description |
|----|-------------|
| PB1 | Returns `{ ok: false, reason: 'count_exceeded' }` when `currentPhotoCount >= 10`. FileReader constructor must not be instantiated. |
| PB2 | Returns `{ ok: false, reason: 'size_exceeded' }` when the resolved `dataUrl.length` exceeds `MAX_PHOTO_DATAURL_BYTES`. |
| PB3 | Returns `{ ok: false, reason: 'load_failed' }` when the injected `ImageCtor`'s `onerror` fires (dimension extraction fails). |
| PB4 | Returns `{ ok: false, reason: 'load_failed' }` when `FileReader.onerror` fires before `onload`. |
| PB5 | Returns `{ ok: true, photo }` with correct shape: `id` (string), `dataUrl` (string), `width` and `height` (numbers), `addedAt` (ISO 8601 string). |
| PB6 | Two sequential successful calls produce distinct `photo.id` values (uniqueness from `generateId`). |

### 2. `src/lib/hooks/__tests__/useLongPress.test.ts` — NEW (6 cases)

Environment: `// @vitest-environment happy-dom`
Uses `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(n))`. Pointer events dispatched via `fireEvent` from `@testing-library/react`.

| ID | Description |
|----|-------------|
| LP1 | `onLongPress` fires exactly once after default 500 ms. |
| LP2 | `onLongPress` does NOT fire when `onPointerUp` is dispatched before 500 ms. |
| LP3 | `onLongPress` does NOT fire when `onPointerMove` displacement exceeds `slopPx` (default 5 px) before the timer elapses. |
| LP4 | Timer is cancelled independently on `onPointerCancel` and on `onPointerLeave`. |
| LP5 | Custom `delayMs` (e.g. 800) is respected: fires at 800 ms, not at 799 ms. |
| LP6 | Unmounting the component while a timer is pending produces no `onLongPress` call after `advanceTimersByTime` (no timer leak). |

### 3. `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx` — NEW (7 cases)

Environment: `// @vitest-environment happy-dom`
Pre-seeds `Photo[]` props directly; no FileReader involved. Uses `vi.useFakeTimers()` for long-press simulation. Mocks `navigator.vibrate = vi.fn()` in `beforeEach`.

| ID | Description |
|----|-------------|
| PC1 | Returns `null` (no DOM nodes) when `photos` is empty. `document.querySelector('[data-testid="photo-carousel"]')` is `null`. |
| PC2 | Renders exactly N `<img>` elements with `data-testid="photo-thumb-{id}"` and `alt="첨부 사진"` for N photos. |
| PC3 | After a 500 ms `pointerdown` hold (fake timers + `advanceTimersByTime(500)`), `data-testid="delete-overlay-{id}"` is in the DOM. |
| PC4 | Tapping `aria-label="사진 삭제"` calls `onDelete` with the correct photo `id` and removes the overlay. |
| PC5 | A `pointerdown` event on `document` outside the overlay dismisses the overlay (`activeId` cleared). |
| PC6 | `navigator.vibrate(50)` is called exactly once on long-press. |
| PC7 | A short tap (pointerdown + pointerup before 500 ms) calls `onThumbnailTap` with the correct `id` when the prop is provided. |

### 4. `src/lib/hooks/__tests__/useEditorState.test.ts` — EXTEND (3 new cases)

Added inside the existing `describe('useEditorState', ...)` block. No new mocks; uses existing `readDiariesMock` and `makeDiary` pattern.

| ID | Description |
|----|-------------|
| ES-photo-1 | Dispatching `ADD_PHOTO` with a `Photo` fixture appends it to `state.photos`; array length goes from 0 to 1. |
| ES-photo-2 | Dispatching `DELETE_PHOTO` with a known `id` removes that photo from `state.photos`; length decreases by 1. |
| ES-photo-3 | `LOAD_ENTRY` with `entry.photos = [photo1, photo2]` sets `state.photos` to that array; entry with `photos: undefined` produces `state.photos = []`. |

### 5. `src/app/diary/[date]/__tests__/Editor.test.tsx` — EXTEND (4 new cases)

Added inside the existing `describe('Editor', ...)` block. Adds one top-level mock:
`vi.mock('@/lib/storage/photoBase64', () => ({ addPhotoFromFile: vi.fn() }))`.
All other setup (navigation mocks, storage mocks, `btn` helper, `renderEditor`) is unchanged.

| ID | Description |
|----|-------------|
| C-photo-1 | Clicking `aria-label="갤러리"` triggers `.click()` on `input[type="file"]`. Spy: `vi.spyOn(HTMLInputElement.prototype, 'click')`. |
| C-photo-2 | A `change` event on `input[type="file"]` with a mock `File` when `addPhotoFromFile` resolves `{ ok: true, photo }` — after autosave debounce — calls `upsertDiary` with an array that includes the new photo. |
| C-photo-3 | When `addPhotoFromFile` resolves `{ ok: false, reason: 'count_exceeded' }`, the toast text `"최대 10장입니다"` appears. |
| C-photo-4 | When `upsertDiary` throws any `Error`, `saveFn` shows toast `"저장에 실패했어요. 다시 시도해주세요."` and does NOT dispatch `MARK_SAVED` (snapshot stays stale). |

---

## Integration Tests

None required separately. The `Editor.test.tsx` photo cases cover the full in-process
integration chain: file input → `addPhotoFromFile` → reducer → autosave debounce → `upsertDiary`.

---

## E2E Tests

### `e2e/photos.spec.ts` — NEW (2 Playwright cases)

Chromium only. Requires a 1×1 PNG fixture at `e2e/fixtures/1x1.png` (create once, commit).
Uses the existing `seedDiariesScript` helper from `e2e/_helpers/seedDiaries.ts`.

| ID | Description |
|----|-------------|
| PE1 | Navigate to editor with a seeded mood entry. Use `page.setInputFiles('input[type="file"]', 'e2e/fixtures/1x1.png')` → `data-testid="photo-carousel"` appears → wait 1 500 ms for autosave → reload page → carousel is still visible with 1 thumbnail. |
| PE2 | Seed an entry with 10 pre-built `Photo` objects in `photos[]`. Navigate to editor → gallery button (`aria-label="갤러리"`) has `disabled` attribute. |

---

## Regression Tests

These existing tests are at risk from the `useEditorState`, `AutosaveValue`, and `EditorToolbar`
changes and must remain green without modification:

| File | Why at risk |
|------|-------------|
| `src/lib/hooks/__tests__/useEditorState.test.ts` | All 5 original cases — `EditorState` shape grows but snapshots (`{ mood, text, textAlign }`) must not break |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | All 13 original cases — `upsertDiary` call shape now includes `photos` field |
| `src/app/diary/[date]/_components/__tests__/HorizontalDatePicker.test.tsx` | `AutosaveValue` type gains required `photos` field — compilation must still pass |
| `src/lib/storage/__tests__/limits.test.ts` | Already exercises `MAX_PHOTOS_PER_ENTRY` and `MAX_PHOTO_DATAURL_BYTES` — must still pass |

---

## Security-Relevant Tests

| Topic | Case | What is checked |
|-------|------|-----------------|
| Size cap enforced before persisting | PB2 | Oversized dataUrl rejected; never dispatched to reducer or storage |
| Count cap checked before FileReader | PB1 | No FileReader allocation at limit; no bypass via race condition |
| `QuotaExceededError` does not crash the app | C-photo-4 | Catch branch shows toast; `MARK_SAVED` not dispatched; app stays in valid state |
| `navigator.vibrate` feature detection | PC6 | Confirms call happens only when the API is truthy; no uncaught TypeError on desktop |

---

## Fixtures / Mocks Needed

| Fixture / Mock | Where used | Notes |
|----------------|-----------|-------|
| Synchronous `FileReader` stub class | `photoBase64.test.ts` | Replaces `globalThis.FileReader`; calls `this.onload` or `this.onerror` synchronously in `readAsDataURL` |
| Injectable `ImageCtor` class | `photoBase64.test.ts` | Passed as 3rd arg to `addPhotoFromFile`; synchronous `onload` with `naturalWidth=100, naturalHeight=80` |
| `makePhoto` factory | `PhotoCarousel.test.tsx`, `useEditorState.test.ts` extensions | Returns `Photo` with unique `id`, `dataUrl: 'data:image/png;base64,abc'`, `width: 100`, `height: 80`, `addedAt: new Date().toISOString()`. Add to `src/lib/storage/__tests__/fixtures.ts`. |
| `navigator.vibrate = vi.fn()` | `PhotoCarousel.test.tsx` `beforeEach` | happy-dom does not define `navigator.vibrate`; must assign before render |
| `vi.mock('@/lib/storage/photoBase64', ...)` | `Editor.test.tsx` additions | Isolates `addPhotoFromFile` with controlled outcomes |
| `e2e/fixtures/1x1.png` | `photos.spec.ts` PE1 | Minimal valid PNG committed to repo; used with `page.setInputFiles` |
| 10-photo seed array | `photos.spec.ts` PE2 | Built inline via `Array.from({length:10}, (_, i) => makePhoto(i))` in seed script |

---

## Selector / test-id Contract

Implementation must honor these selectors exactly (from API contract doc):

| Element | Selector |
|---------|----------|
| Hidden file input | `input[type="file"]` |
| Gallery button | `aria-label="갤러리"` |
| Carousel container | `data-testid="photo-carousel"` + `role="list"` |
| Thumbnail image | `data-testid="photo-thumb-{id}"` + `alt="첨부 사진"` |
| Thumbnail wrapper | `role="listitem"` |
| Delete overlay | `data-testid="delete-overlay-{id}"` |
| Delete button | `aria-label="사진 삭제"` + `role="button"` |

---

## Commands to Run

```bash
# Typecheck (catches AutosaveValue and EditorState shape regressions)
npm run typecheck

# All unit tests (full regression check)
npm test

# New test files in isolation
npx vitest run src/lib/storage/__tests__/photoBase64.test.ts
npx vitest run src/lib/hooks/__tests__/useLongPress.test.ts
npx vitest run "src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx"
npx vitest run src/lib/hooks/__tests__/useEditorState.test.ts
npx vitest run "src/app/diary/[date]/__tests__/Editor.test.tsx"

# E2E
npx playwright test e2e/photos.spec.ts
```

---

## Not Applicable Tests

| Category | Reason |
|----------|--------|
| Full-screen photo viewer tap | REQ-012 scope; `onThumbnailTap` is a no-op. PC7 verifies the prop is forwarded — the viewer logic is not yet implemented. |
| Multi-file upload | `multiple` attribute is absent; OS delivers at most one file. |
| Camera capture | Non-goal per REQ-011. |
| Image auto-resize / compression | Out of scope for MVP. |
| IndexedDB migration | v2 scope. |
| Undo on delete | Not implemented in MVP; deletion is immediate per technical design. |
| `isProcessing.current` duplicate-dialog guard | No user-visible effect to assert; a silent no-op guard. |
| localStorage size warning toast | Open Question 2 from intake; not confirmed in-scope in the technical design. |
| Backend / API tests | REQ-011 is fully client-side; no server routes or HTTP calls. |
| Snapshot tests | No snapshot testing convention in this project. |

---

## Verdict
PASS
