# Frontend Implementation — REQ-011

## Summary

REQ-011 adds photo attachment to the diary editor: a hidden file input activated by the existing
gallery button, a `FileReader`-based base64 encoding utility, a horizontally-scrolling thumbnail
carousel with per-photo long-press-to-delete overlay, and full wiring into the REQ-009 autosave
pipeline. No new UI libraries. No backend changes.

---

## Files Changed

### New files

| File | Lines | Budget |
|------|-------|--------|
| `src/lib/storage/photoBase64.ts` | 49 | ≤60 |
| `src/lib/hooks/useLongPress.ts` | 45 | ≤40 (marginally over; no split available) |
| `src/app/diary/[date]/_components/PhotoCarousel.tsx` | 81 | ≤90 |
| `src/lib/storage/__tests__/photoBase64.test.ts` | 121 | test file |
| `src/lib/hooks/__tests__/useLongPress.test.ts` | 114 | test file |
| `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx` | 112 | test file |
| `e2e/photos.spec.ts` | 57 | new |
| `e2e/fixtures/1x1.png` | binary | new (69 bytes, minimal valid PNG) |

### Modified files

| File | Lines before | Lines after | Change |
|------|-------------|-------------|--------|
| `src/lib/hooks/useEditorState.ts` | 111 | 119 | +photos field, +ADD_PHOTO/DELETE_PHOTO actions, +LOAD_ENTRY photos spread |
| `src/lib/hooks/useHorizontalDatePicker.ts` | 104 | 104 | +photos: Photo[] to AutosaveValue type |
| `src/app/diary/[date]/_components/Editor.tsx` | 193 | 243 | +file input ref, +isProcessing guard, +autosaveValue photos, +saveFn try/catch, +gallery handlers, +PhotoCarousel mount |
| `src/app/diary/[date]/_components/EditorToolbar.tsx` | 109 | 111 | +galleryDisabled? prop |
| `src/lib/storage/__tests__/fixtures.ts` | 43 | 58 | +makePhoto factory |
| `src/lib/hooks/__tests__/useEditorState.test.ts` | 114 | 152 | +ES-photo-1..3 |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | 334 | 400 | +vi.mock photoBase64, +C-photo-1..4 |
| `src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts` | 172 | 172 | +photos: [] to all autosaveValue objects (type fix) |

---

## Behavior Added

1. **Gallery button** (`aria-label="갤러리"`) opens a hidden `<input type="file" accept="image/*">` — no `multiple` attribute.
2. **Photo count guard** in `handleGalleryTap`: shows toast "최대 10장입니다" and does NOT open file picker at limit. Gallery button gets `disabled` + `opacity-50 cursor-not-allowed`.
3. **`addPhotoFromFile`**: FileReader → base64 → size check vs `MAX_PHOTO_DATAURL_BYTES` → `Image()` dimension extract → typed `AddPhotoOutcome`. Never throws.
4. **File input reset**: `fileInputRef.current.value = ''` reset before async work so same file can be re-selected.
5. **`isProcessing.current`** ref guards re-entrant gallery taps.
6. **`ADD_PHOTO`/`DELETE_PHOTO`** reducer actions; photos appended (not prepended).
7. **`LOAD_ENTRY`** spreads `entry.photos ?? []` into state.
8. **`autosaveValue`** includes `photos: state.photos` — photo changes trigger autosave debounce.
9. **`saveFn`** passes `photos: v.photos` (was hardcoded `[]`). Wrapped in try/catch: any thrown error → toast "저장에 실패했어요. 다시 시도해주세요." and MARK_SAVED skipped.
10. **`PhotoCarousel`**: scroll-snap, no-scrollbar, 88×88px thumbnails, 8px gap. Returns `null` when empty.
11. **Long-press 500ms** → dark scrim overlay with "삭제" button + `navigator.vibrate(50)` (feature-detected).
12. **Tap-outside overlay** dismissal via `document.addEventListener('pointerdown', ...)` gated by `activeId !== null`.
13. **Short tap** → calls `onThumbnailTap` prop (no-op by default; REQ-012 will wire).
14. **`useLongPress`**: 5px slop cancels timer on move; cleanup on unmount.

---

## Existing Patterns Reused

- `useToast` / `<Toast>` — existing single-toast pattern for all messages.
- `no-scrollbar` Tailwind utility — same as `HorizontalDatePicker`.
- `generateId()` from `@/lib/storage` — for `photo.id`.
- `makePhoto` follows same factory pattern as `makeDiary`/`makeConversation`.
- `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime())` — same as `useAutosave.test.ts`.
- `// @vitest-environment happy-dom` file-level annotation — same as existing test files.

---

## Tests Added / Updated

### New test files (26 unit/integration cases)

| File | Cases | Status |
|------|-------|--------|
| `src/lib/storage/__tests__/photoBase64.test.ts` | 6 (PB1–PB6) | PASS |
| `src/lib/hooks/__tests__/useLongPress.test.ts` | 6 (LP1–LP6) | PASS |
| `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx` | 7 (PC1–PC7) | PASS |

### Extended test files

| File | New cases | Status |
|------|-----------|--------|
| `src/lib/hooks/__tests__/useEditorState.test.ts` | 3 (ES-photo-1..3) | PASS |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | 4 (C-photo-1..4) | PASS |

### Regression fixes

| File | Fix |
|------|-----|
| `src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts` | Added `photos: []` to all 7 `autosaveValue` objects (required by AutosaveValue type change) |

### E2E spec (written, not run — Phase 10 owns execution)

- `e2e/photos.spec.ts`: PE1 (add → autosave → reload → persists), PE2 (10 photos → gallery disabled)
- `e2e/fixtures/1x1.png`: 69-byte minimal valid PNG for `page.setInputFiles`

---

## Commands Run

```
npx tsc --noEmit          → 0 errors
npm run lint              → No ESLint warnings or errors
npx vitest run --reporter=basic
  Test Files  38 passed (38)
       Tests  263 passed (263)   [baseline 237 + 26 new]
```

---

## Risks / Follow-ups

1. **`Editor.tsx` at 243 lines** — pre-existing over-budget state accepted for this REQ per design decision; flagged for extraction in next REQ.
2. **`useLongPress.ts` at 45 lines** — marginally over the 40-line budget; no natural split point exists.
3. **localStorage quota** — `MAX_PHOTO_DATAURL_BYTES` (150KB) × 10 = 1.5MB per entry. try/catch on `saveFn` is the only guard; no auto-resize in MVP (documented risk from PRD §3.9).
4. **REQ-012 coupling** — `onThumbnailTap` prop is a no-op stub. Ready for REQ-012 to wire full-screen viewer without touching `PhotoCarousel` internals.

---

---

## Fix Cycle 1 — E2E Test Failures Post-REQ-011

### Root causes identified

**Issue 1: VS Code extension host on port 3000 (primary blocker)**

VS Code's extension host process (`Code Helper`) was listening on `127.0.0.1:3000` (IPv4). Next.js bound to `*:3000` (IPv6 wildcard). When Playwright sent HTTP requests to `http://localhost:3000`, the OS resolved `localhost` to `127.0.0.1` (IPv4) and hit the VS Code process instead of Next.js. VS Code returned a directory-index HTML page (Korean title `/의 인덱스`), which is why every test saw "element not found" — the app never rendered. Confirmed by `curl http://127.0.0.1:3000` (VS Code response) vs `curl http://localhost:3000` (app response when IPv6 resolved).

**Issue 2: Playwright `webServer.url` health check passed prematurely**

Next.js's dev server serves an intermediate startup HTML page with HTTP 200 before route compilation is complete. Playwright's `url` health check was satisfied by that early 200, so it declared the server ready before any route was compiled. On cold start this caused a race where the first `page.goto('/')` (assertion timeout 5s) fired while Next.js was still compiling (1-2s).

**Issue 3: PE1 `page.reload()` overwrote autosaved localStorage**

`page.addInitScript()` runs on every navigation — including `page.reload()`. The PE1 test seeded localStorage with `photos: []`, waited for autosave to write `photos: [1 photo]`, then reloaded. The init-script re-ran on reload and overwrote the autosaved data back to `photos: []`, making the carousel disappear. This was a test-infrastructure bug, not an app bug.

### Fixes applied

| File | Change |
|------|--------|
| `playwright.config.ts` | Changed `baseURL` and `webServer.url` to `http://localhost:3001`; changed `webServer.command` to `next dev --port 3001`; added `stdout: 'pipe'` + `wait: { stdout: /Ready in/ }` so server readiness is declared only after Next.js logs "Ready in"; raised `expect.timeout` to 15s; set `workers: 1`; added `navigationTimeout: 15_000` |
| `e2e/_helpers/seedDiaries.ts` | Added `seedDiariesOnceScript()` — a variant that only writes localStorage if the key is absent; safe to use when the test reloads after the app mutates the key |
| `e2e/photos.spec.ts` | PE1 uses `seedDiariesOnceScript` instead of `seedDiariesScript` so the autosaved photo survives `page.reload()` |

### Final test results after fixes

```
npx vitest run --reporter=basic
  Test Files  38 passed (38)
       Tests  263 passed (263)

npm run test:e2e  (cold start — server killed first)
  6 passed (20.2s)
  ✓ calendar.spec.ts — 캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동
  ✓ editor.spec.ts — 캘린더 빈 셀 → 무드 선택 → 본문 입력 → 자동 저장 → 뒤로 → 캘린더에 무드 표시
  ✓ horizontal-date-picker.spec.ts E1
  ✓ horizontal-date-picker.spec.ts E2
  ✓ photos.spec.ts PE1
  ✓ photos.spec.ts PE2

npm run lint      → 0 warnings, 0 errors
npm run typecheck → 0 errors
```

---

## Verdict
PASS

---

## Fix Cycle 3 — L-1 MIME-type hardening in `addPhotoFromFile`

### Change: MIME-type prefix guard in `src/lib/storage/photoBase64.ts`

After `readAsDataUrl` resolves and before the byte-length check, one line was inserted:

```ts
if (!dataUrl.startsWith('data:image/')) return { ok: false, reason: 'load_failed' };
```

This rejects any `dataUrl` whose MIME prefix is not an image type (e.g. `data:text/html,...`, `data:application/javascript,...`). The guard fires before the size check, so a crafted non-image URL that happens to be small cannot slip through to `getDimensions` or later rendering contexts (REQ-012 full-screen viewer).

### Collateral fix: PB2 mock updated in `src/lib/storage/__tests__/photoBase64.test.ts`

The existing PB2 test used `'x'.repeat(MAX_PHOTO_DATAURL_BYTES + 1)` as the oversize dataUrl, which no longer starts with `data:image/` and would now be rejected by the new guard (returning `load_failed`) before reaching the size check. The `BigFileReader` mock was updated to prefix the padding with `'data:image/png;base64,'` so it correctly exercises the size path:

```ts
const prefix = 'data:image/png;base64,';
const padding = 'A'.repeat(MAX_PHOTO_DATAURL_BYTES + 1 - prefix.length);
this.result = prefix + padding;
```

### New test: PB7

Added to `src/lib/storage/__tests__/photoBase64.test.ts`:

**PB7** — `load_failed` when `FileReader` returns a non-image MIME prefix (e.g. `data:text/html,<script>alert(1)</script>`). Uses `NonImageFileReader` stub class; confirms the guard fires before the `Image()` decode step (OkImage stub is passed but never reached).

### Verification

```
npx vitest run --reporter=basic
  Test Files  38 passed (38)
       Tests  265 passed (265)   [264 + 1 new PB7]

npx tsc --noEmit    → 0 errors
npm run lint        → No ESLint warnings or errors
```

---

## Fix Cycle 2 — REQ-011 Code Review Blocking Issue B-1 + NBs

### Changes made

#### B-1 (blocking): Per-instance `overlayRef` and tap-outside `useEffect` in `Thumb`

**File**: `src/app/diary/[date]/_components/PhotoCarousel.tsx`

- Removed `overlayRef` from `PhotoCarousel` and removed it from `Thumb`'s props.
- Each `Thumb` instance now declares its own `const overlayRef = useRef<HTMLDivElement | null>(null)`.
- The `useEffect` that adds `document.pointerdown` for tap-outside detection was removed from `PhotoCarousel` and added inside `Thumb`, conditioned on `isActive`.
- The tap-outside handler calls `onActivate('')` (sentinel value); `PhotoCarousel.activate` maps `''` → `setActiveId(null)`.

#### NB-3 (non-blocking): Type-guard on `FileReader.result`

**File**: `src/lib/storage/photoBase64.ts` line 11

- `r.onload` now checks `typeof e.target?.result !== 'string'` before calling `resolve`. If the result is not a string (e.g., `ArrayBuffer`), it calls `reject(new Error(...))` instead of casting with `as string`.

#### NB-4 (non-blocking): `didCancel` ref suppresses `onShortTap` after move-slop cancellation

**File**: `src/app/diary/[date]/_components/PhotoCarousel.tsx`

- Added `didCancel = useRef(false)` inside `Thumb`.
- `onPointerDown` resets `didCancel.current = false` before starting the press.
- `onPointerMove` sets `didCancel.current = true` (move-slop exceeded means the user is scrolling, not tapping).
- `onPointerUp` skips `onShortTap` when `didCancel.current === true`; resets both `didLong` and `didCancel`.
- The explicit `onPointerDown`, `onPointerMove`, `onPointerUp` props are placed after `{...lp}` spread on the `<img>`, so they override the hook's versions and call the hook handlers internally.

#### Nit: Remove redundant `role="button"` from `<button>`

**File**: `src/app/diary/[date]/_components/PhotoCarousel.tsx` line 68

- Removed `role="button"` from `<button type="button" ...>`. A `<button>` element implicitly has `role="button"` per the HTML spec.

### Test added

**PC8** in `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx`:

Regression test for B-1. With 2 photos: long-press A → overlay A visible; long-press B → overlay B visible AND overlay A gone (single `activeId` guarantee); tap outside B → overlay B closes.

### Verification results

```
npx vitest run --reporter=basic
  Test Files  38 passed (38)
       Tests  264 passed (264)   [baseline 263 + 1 new PC8]

npm run test:e2e
  6 passed (19.0s)

npx tsc --noEmit    → 0 errors
npm run lint        → No ESLint warnings or errors
```
