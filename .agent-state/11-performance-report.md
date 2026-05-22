# Performance Review Report — REQ-011

## Summary

REQ-011 adds base64 photo attachment to the client-side diary editor. The feature touches localStorage read/write on every autosave, carousel rendering, pointer-event handling, and the FileReader/Image decode pipeline. All identified costs are proportionate for a single-user, mobile-first, localStorage-backed app. No blocking performance issues were found.

## Scope

Files examined:

- `src/lib/storage/photoBase64.ts`
- `src/lib/storage/diaries.ts`
- `src/lib/storage/limits.ts`
- `src/lib/storage/index.ts`
- `src/app/diary/[date]/_components/PhotoCarousel.tsx`
- `src/lib/hooks/useLongPress.ts`
- `.agent-state/03-technical-design.md`
- `.agent-state/07-implementation-report.md`
- `.agent-state/09-code-review-report.md`

## Findings

### 1. upsertDiary read-all/write-all cost with photos included

`upsertDiary` calls `readDiaries()` (JSON.parse of the entire diaries key) then `writeAllDiaries()` (JSON.stringify of the entire array). With photos included, a single autosave on an entry with 10 photos at 150 KB each serializes a 1.5 MB base64 payload as a JSON string inside a larger JSON array. At a 1-second debounce rate, this fires at most once per second during active photo operations and at keystroke-debounce rate during text entry.

For a single-user app with a realistic diary corpus (e.g., 365 entries, one with 10 photos), the entire diaries key can approach 2–3 MB. JSON.parse and JSON.stringify of a 2 MB string on a mid-range mobile device takes roughly 5–15 ms synchronously on the main thread. This is perceptible if it coincides with a frame, but the debounced trigger means it does not happen per-keystroke — only after the 1-second idle. This cost is acceptable for MVP. The documented risk (PRD §3.9, design report, implementation report) is acknowledged. No architectural change is warranted at this scale.

Observation: because photos are stored as base64 strings inside JSON, the effective serialization cost is higher than binary storage would be (roughly 1.37x overhead from base64 encoding). At 10 photos this yields ~2 MB of JSON data inside the broader key. Still within the browser's single-call synchronous budget for a personal-use app.

### 2. autosaveValue recomputation per photo mutation

`autosaveValue` is a `useMemo` depending on `[state.mood, state.text, state.textAlign, state.photos]`. Each `ADD_PHOTO` or `DELETE_PHOTO` dispatch creates a new array reference, triggering the memo and starting the 1-second debounce. This is correct and intentional. During text typing, `state.photos` is a stable reference (same array, not re-created), so photo inclusion in the memo does not add any per-keystroke cost beyond what existed before.

### 3. Carousel render cost (up to 10 img elements)

Each `<Thumb>` renders one `<img src={photo.dataUrl}>`. The browser decodes a base64 image once on first paint and caches the decoded bitmap. Subsequent renders of the same `src` string do not re-decode. With up to 10 images at 88x88 px display size (the source may be larger), the combined GPU upload cost is negligible. The carousel is conditionally rendered (`photos.length > 0`) so the zero-photo case has zero DOM overhead. No virtualization is needed at 10 items.

### 4. document.pointerdown listener per Thumb

Each `Thumb` attaches a `document.pointerdown` handler only when `isActive === true` (a `useEffect` with `[isActive, onActivate]` dependency). Since `activeId` is a single string in `PhotoCarousel`, at most one `Thumb` has `isActive === true` at any time, meaning at most one `document.pointerdown` listener is active globally. The effect cleanup removes the listener when `isActive` becomes false or when the component unmounts. Listener cost is negligible.

### 5. useLongPress setTimeout per thumbnail

A single `setTimeout(500ms)` is created on `pointerDown` and cleared on `pointerUp`, `pointerMove` (beyond slop), `pointerCancel`, or `pointerLeave`. The `useEffect` cleanup in `useLongPress` calls `cancel()` on unmount, preventing leaks when the carousel is unmounted while a press is in flight. One timer per active press — no accumulation.

### 6. FileReader + Image decode pipeline

`readAsDataUrl` is async (browser off-main-thread); the main thread is not blocked during file reading. The subsequent `getDimensions` call (setting `img.src = dataUrl`) schedules a microtask for the `onload` callback once the browser decodes the already-loaded base64 string. This is a one-time cost per photo add, not on any hot path. The MIME-type prefix guard (`data:image/`) fires synchronously before the `Image` decode step, short-circuiting invalid files cheaply.

### 7. Size guard ordering

The size check (`dataUrl.length > MAX_PHOTO_DATAURL_BYTES`) fires after the MIME guard but before `getDimensions`. This is the correct order: a non-image file is rejected cheaply, then an oversized file is rejected without triggering the Image decode, and only valid small images proceed to dimension extraction. No wasted work.

### 8. localStorage quota boundary

10 photos × 150 KB = 1.5 MB per entry (base64 string length). The 5 MB total localStorage cap leaves approximately 3.5 MB for all other diary entries and conversations. A user with several photo-heavy entries could approach the quota. The `saveFn` try/catch on `QuotaExceededError` surfaces a Korean toast and skips `MARK_SAVED`. This is the only guard; there is no proactive quota check or automatic compression. This is a known, accepted risk per PRD §3.9.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. **Consider a proactive quota estimate before committing the write.** Currently the app discovers quota exhaustion only after `localStorage.setItem` throws. A pre-write estimate (`navigator.storage.estimate()` is async and not available in all environments, but a rough heuristic of `existingDataSize + newPhotoSize > threshold` could provide an earlier, friendlier warning before the user adds a photo that will fail to save). This is a v2 improvement; the current try/catch guard is acceptable for MVP.

2. **`upsertDiary` deserializes the entire corpus on every autosave.** For future REQs that increase photo counts or add more per-entry data, consider indexing the diary array by `id` in a separate key (or switching to IndexedDB, already noted as a v2 plan). No action needed now, but this is the single most impactful future optimization given that JSON.parse of a large blob is the dominant cost on the save path.

3. **`onThumbnailTap={() => {}}` inline arrow in `Editor.tsx`** causes `shortTap` (a `useCallback([onThumbnailTap])` inside `PhotoCarousel`) to re-create on every `Editor` render. This has no user-visible cost today because the callback is a no-op, but when REQ-012 wires a real callback, the pattern should be changed to `useCallback(() => {}, [])` at the call site. Flag for REQ-012 implementor.

## Verdict
PASS
