# Technical Design — REQ-011: 사진 추가 / 카로젤 / 길게 누름 삭제

## Summary

REQ-011 adds photo attachment to the diary editor: a hidden file input activated by the existing gallery button, a `FileReader`-based base64 encoding utility, a horizontally scrolling thumbnail carousel with per-photo long-press-to-delete overlay, and plumbing to route all photo mutations through the existing REQ-009 autosave pipeline. No new dependencies are introduced. No backend or DB changes.

---

## Implementation Strategy

Work in strict bottom-up dependency order: storage utility first, hook second, component third, editor wiring last. Each layer is independently testable before the next is written.

---

## Overview

The feature has four layers:

1. **Storage utility** (`photoBase64.ts`): FileReader + Image dimension extraction + size/count guards.
2. **Long-press hook** (`useLongPress.ts`): pointer-event timer with slop cancellation.
3. **Carousel component** (`PhotoCarousel.tsx`): thumbnails + per-photo delete overlay.
4. **Editor wiring** (`Editor.tsx`, `useEditorState.ts`, `EditorToolbar.tsx`, `useHorizontalDatePicker.ts`): state actions, autosave integration, hidden file input, JSX placement.

---

## Component / File Map (final list)

**New files:**

| Path | Purpose |
|---|---|
| `src/lib/storage/photoBase64.ts` | `addPhotoFromFile()` — FileReader, Image dimension read, size/count guard |
| `src/lib/hooks/useLongPress.ts` | `useLongPress()` — 500 ms pointer-event hook with slop |
| `src/app/diary/[date]/_components/PhotoCarousel.tsx` | Carousel + overlay |
| `src/lib/storage/__tests__/photoBase64.test.ts` | Unit tests with mocked FileReader + Image |
| `src/lib/hooks/__tests__/useLongPress.test.ts` | Unit tests with fake timers + pointer events |
| `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx` | Render tests |

**Modified files:**

| Path | Change summary |
|---|---|
| `src/lib/hooks/useEditorState.ts` | Add `photos: Photo[]` to state + `ADD_PHOTO`/`DELETE_PHOTO` actions |
| `src/lib/hooks/useHorizontalDatePicker.ts` | Add `photos: Photo[]` to `AutosaveValue` type |
| `src/app/diary/[date]/_components/Editor.tsx` | Wire file input, photo handlers, carousel mount, try/catch on saveFn |
| `src/app/diary/[date]/_components/EditorToolbar.tsx` | Add `galleryDisabled?: boolean` prop |

---

## Data Flow Diagram (text)

```
User taps gallery button
  → inputRef.current.click()
    → onChange fires with File
      → addPhotoFromFile(file, currentPhotoCount)
          → reject if count >= 10  → toast "최대 10장입니다"
          → read dataUrl via FileReader
          → reject if dataUrl.length > MAX_PHOTO_DATAURL_BYTES → toast "파일이 너무 큽니다"
          → extract width/height via new Image()
          → return Photo object
        → dispatch({ type: 'ADD_PHOTO', photo })
          → state.photos grows by 1
            → autosaveValue changes (photos included)
              → useAutosave debounces → saveFn(v)
                → upsertDiary({ ...v.photos })
                → try/catch QuotaExceededError → toast error

User long-presses thumbnail (≥500 ms, no slop)
  → useLongPress onLongPress fires
    → navigator.vibrate(50)
    → setActiveId(photo.id)  ← local state in PhotoCarousel
      → overlay renders on that thumbnail
        → document pointerdown listener attaches

User taps "삭제" in overlay
  → dispatch({ type: 'DELETE_PHOTO', id })
    → state.photos filtered
      → overlay dismisses (activeId cleared)
        → autosave debounce fires → saveFn

User taps outside overlay
  → document pointerdown, !overlayRef.contains(e.target)
    → setActiveId(null)
      → overlay dismisses, listener removed
```

---

## Exact Function Signatures

```typescript
// src/lib/storage/photoBase64.ts

export interface AddPhotoResult {
  ok: true;
  photo: Photo;
}
export interface AddPhotoError {
  ok: false;
  reason: 'count_exceeded' | 'size_exceeded' | 'load_failed';
}
export type AddPhotoOutcome = AddPhotoResult | AddPhotoError;

/** Reads file as base64 data URL, extracts dimensions, validates limits.
 *  currentPhotoCount is checked before FileReader is even started.
 *  Returns a resolved Promise always (no thrown exceptions from this fn).
 *  ImageCtor is injectable for tests (defaults to globalThis.Image).
 */
export async function addPhotoFromFile(
  file: File,
  currentPhotoCount: number,
  ImageCtor?: typeof Image,
): Promise<AddPhotoOutcome>;
```

```typescript
// src/lib/hooks/useLongPress.ts

export interface LongPressOptions {
  onLongPress: () => void;
  delayMs?: number;       // default 500
  slopPx?: number;        // default 5
}

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
}

/** Returns pointer-event handlers to spread onto the target element. */
export function useLongPress(options: LongPressOptions): LongPressHandlers;
```

```typescript
// src/app/diary/[date]/_components/PhotoCarousel.tsx

export interface PhotoCarouselProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  /** Reserved for REQ-012. Default: () => {} */
  onThumbnailTap?: (id: string) => void;
}

export function PhotoCarousel(props: PhotoCarouselProps): React.ReactElement | null;
```

---

## Editor.tsx Integration Delta (pseudocode)

```
// New refs/state (add near top of Editor function body):
const fileInputRef = useRef<HTMLInputElement>(null);
const isProcessing = useRef(false);

// Update autosaveValue:
const autosaveValue = useMemo(
  () => ({ mood: state.mood, text: state.text, textAlign: state.textAlign, photos: state.photos }),
  [state.mood, state.text, state.textAlign, state.photos],
);

// Update saveFn — change photos: [] to photos: v.photos, add try/catch:
const saveFn = useCallback(
  (v: typeof autosaveValue) => {
    if (!v.mood) return;
    const id = state.persistedId ?? generateId();
    const createdAt = state.persistedCreatedAt ?? new Date().toISOString();
    try {
      upsertDiary({
        id, date: currentDate, mood: v.mood, text: v.text, textAlign: v.textAlign,
        photos: v.photos, createdAt, updatedAt: new Date().toISOString(),
      });
    } catch {
      toast.show('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    dispatch({ type: 'MARK_SAVED', id, createdAt });
  },
  [state.persistedId, state.persistedCreatedAt, currentDate, dispatch, toast],
);

// New handlers:
function handleGalleryTap() {
  if (isProcessing.current || state.photos.length >= MAX_PHOTOS_PER_ENTRY) {
    if (state.photos.length >= MAX_PHOTOS_PER_ENTRY) toast.show('최대 10장입니다');
    return;
  }
  fileInputRef.current?.click();
}

async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (fileInputRef.current) fileInputRef.current.value = '';  // reset immediately
  if (!file) return;
  isProcessing.current = true;
  const result = await addPhotoFromFile(file, state.photos.length);
  isProcessing.current = false;
  if (!result.ok) {
    if (result.reason === 'count_exceeded') toast.show('최대 10장입니다');
    else if (result.reason === 'size_exceeded') toast.show('파일이 너무 큽니다');
    else toast.show('사진을 불러오지 못했어요');
    return;
  }
  dispatch({ type: 'ADD_PHOTO', photo: result.photo });
}

// JSX — hidden file input added after <main> open tag (or just before closing </main>):
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="sr-only"
  aria-hidden="true"
  tabIndex={-1}
  onChange={handleFileChange}
/>

// JSX — PhotoCarousel placement: between <EditorBody> and <Toast>:
<EditorBody ... />

{state.photos.length > 0 && (
  <PhotoCarousel
    photos={state.photos}
    onDelete={(id) => dispatch({ type: 'DELETE_PHOTO', id })}
    onThumbnailTap={() => {}}
  />
)}

<Toast ... />

// EditorToolbar: add galleryDisabled prop:
<EditorToolbar
  ...
  onGalleryTap={handleGalleryTap}
  galleryDisabled={state.photos.length >= MAX_PHOTOS_PER_ENTRY}
/>
```

Note on placement: `<PhotoCarousel>` is placed between `<EditorBody>` and `<Toast>` in the JSX. `<Toast>` sits before `<EditorToolbar>` in the current source, which means the visual order from top to bottom is: header → body → carousel → toast (hidden when closed) → toolbar.

---

## useEditorState Integration Delta

```typescript
// Add to imports:
import type { Photo } from '@/lib/storage';

// Add to EditorState:
photos: Photo[];

// Add to EditorAction union:
| { type: 'ADD_PHOTO'; photo: Photo }
| { type: 'DELETE_PHOTO'; id: string }

// Add to INITIAL_STATE:
photos: [],

// LOAD_ENTRY case: after destructuring entry fields, add:
photos: action.entry.photos ?? [],

// ADD_PHOTO case (new):
case 'ADD_PHOTO':
  return { ...state, photos: [...state.photos, action.photo] };

// DELETE_PHOTO case (new):
case 'DELETE_PHOTO':
  return { ...state, photos: state.photos.filter((p) => p.id !== action.id) };

// MARK_SAVED: no change — snapshot remains { mood, text, textAlign }. Photos are NOT
// in the dirty snapshot. Photo changes trigger autosave via autosaveValue membership,
// not via isDirty.
```

---

## AutosaveValue Type Change

```typescript
// src/lib/hooks/useHorizontalDatePicker.ts
// Add Photo import:
import type { Photo } from '@/lib/storage';

// Extend AutosaveValue:
export type AutosaveValue = {
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  photos: Photo[];          // NEW
};
```

The `handleDateSelect` callback already passes `autosaveValue` to `saveFn`. With `photos` included, a date-switch saves the current photos correctly. No other logic in `useHorizontalDatePicker.ts` needs to change.

---

## Visual Spec (sizes, colors using tokens)

**Carousel container:**
- `overflow-x: auto` + `scroll-snap-type: x mandatory`
- `no-scrollbar` utility class (reused from `HorizontalDatePicker`)
- `WebkitOverflowScrolling: 'touch'`
- `padding: 4px` (all sides) to avoid clipping shadow
- horizontal gap: `8px`
- background: `bg-cream` (matches editor background)
- hidden entirely when `photos.length === 0` — conditional render

**Each thumbnail:**
- Size: `88px × 88px` (fixed; midpoint of 80–96 range)
- `border-radius: 12px`
- `object-fit: cover`
- `scroll-snap-align: start`
- `flex-shrink: 0`
- rendered as `<img src={photo.dataUrl} alt="첨부 사진" />`

**Delete overlay (per thumbnail):**
- Absolutely positioned over thumbnail, same 88×88 container
- Background: `rgba(0, 0, 0, 0.45)` (dark scrim — NOT brand peach)
- `border-radius: 12px` (matches thumbnail)
- Centered "삭제" button: `44×44` min touch target, white text `text-white`, `text-sm font-medium`
- `role="button"` + `aria-label="사진 삭제"`

**Gallery button disabled state (EditorToolbar):**
- `disabled` HTML attribute on the `<button>`
- `opacity-50 cursor-not-allowed` Tailwind classes added when `galleryDisabled` is true

---

## Accessibility Spec

- Hidden file input: `aria-hidden="true"` + `tabIndex={-1}` + `className="sr-only"` — keyboard users cannot focus it accidentally.
- Gallery button: existing `aria-label="갤러리"` preserved. When disabled: `aria-disabled="true"` (set by native `disabled` attribute).
- Each carousel thumbnail `<img>`: `alt="첨부 사진"` (generic; specific alt text is v2).
- Delete overlay button: `role="button"` + `aria-label="사진 삭제"` + `44×44` touch target.
- Carousel container: `role="list"` with each thumbnail wrapper `role="listitem"`.
- Toast for errors: existing `<Toast>` with default `role="status"`. For MVP this is acceptable; a future pass may split an `role="alert"` toast for errors.

---

## Error Handling Spec

| Scenario | Guard location | User-facing message | Action |
|---|---|---|---|
| `photos.length >= 10` | `handleGalleryTap` (before click) and inside `addPhotoFromFile` | `"최대 10장입니다"` | toast, no file picker |
| `dataUrl.length > MAX_PHOTO_DATAURL_BYTES` | `addPhotoFromFile` after FileReader resolves | `"파일이 너무 큽니다"` | toast, photo not added |
| Image load fails (`img.onerror`) | `addPhotoFromFile` dimension extraction | `"사진을 불러오지 못했어요"` | toast, photo not added |
| `QuotaExceededError` from `upsertDiary` | `saveFn` try/catch in `Editor.tsx` | `"저장에 실패했어요. 다시 시도해주세요."` | toast, MARK_SAVED not dispatched |
| FileReader error event | `addPhotoFromFile` `reader.onerror` | returns `{ ok: false, reason: 'load_failed' }` | caller shows generic error toast |
| `isProcessing.current === true` | `handleGalleryTap` | silent — no duplicate dialog | guard only |

---

## Edge Case Resolutions

1. **PhotoCarousel mount location**: between `<EditorBody>` and `<Toast>` in `Editor.tsx` JSX.

2. **File input element**: hidden `<input type="file" accept="image/*">` in `Editor.tsx` with `fileInputRef`. After each selection, `fileInputRef.current.value = ''` is reset at the top of `handleFileChange` before any async work, ensuring same-file re-select works.

3. **Photo width/height extraction**: `addPhotoFromFile` creates `new (ImageCtor ?? globalThis.Image)()`, sets `img.src = dataUrl`, resolves on `img.onload` reading `naturalWidth`/`naturalHeight`, rejects on `img.onerror`. Injectable constructor for unit tests.

4. **Specific overlay UI**: dark scrim `rgba(0,0,0,0.45)` positioned absolute over the 88×88 thumbnail container with matching `border-radius: 12px`. Centered "삭제" button with `min-h-[44px] min-w-[44px]`, `text-white`, `role="button"`, `aria-label="사진 삭제"`.

5. **Carousel thumbnail size**: `88px × 88px`, `8px` gap between thumbnails, `4px` padding on scroll container, `object-fit: cover`, `border-radius: 12px`.

6. **Carousel container hidden**: `{state.photos.length > 0 && <div ...>...</div>}` — conditional render, zero DOM nodes when empty.

7. **Reducer test coverage**: ADD_PHOTO appends to array; DELETE_PHOTO filters by id; LOAD_ENTRY spreads `entry.photos ?? []`; MARK_SAVED snapshot remains `{mood, text, textAlign}` — photos NOT in snapshot.

8. **MARK_SAVED and photos**: photos are NOT part of the dirty snapshot. Photos enter autosave via `autosaveValue` membership, which fires the debounce directly. The `isDirty` flag (comparing snapshot to current state) stays text/mood/align only.

9. **useLongPress API**: returns `{ onPointerDown, onPointerUp, onPointerMove, onPointerCancel, onPointerLeave }` to spread. Tracks `startX/startY` from pointerdown. Cancels on move > `slopPx` (default 5).

10. **Tap-outside listener cleanup**: `document.addEventListener('pointerdown', handler)` is called inside a `useEffect` that depends on `activeId !== null`. Cleanup removes the listener when `activeId` becomes `null` or the component unmounts.

11. **Editor.tsx file size impact**: inline the file-input element and handlers in `Editor.tsx`. No `GalleryInput.tsx` sub-component. Editor projected at ~230 lines — over budget but acceptable for this REQ.

12. **Test strategy for FileReader/Image**: `photoBase64.test.ts` mocks `globalThis.FileReader` with a class whose `readAsDataURL` sets `this.result` then synchronously calls `this.onload({} as ProgressEvent)`. Mocks `globalThis.Image` with a class that synchronously calls `this.onload()` and exposes fixed `naturalWidth`/`naturalHeight`. `PhotoCarousel.test.tsx` renders with pre-seeded `Photo[]` props — no FileReader involvement.

---

## Test Hooks (selectors, aria-labels, data-testids)

| Element | Selector |
|---|---|
| Hidden file input | `document.querySelector('input[type="file"]')` |
| Gallery button | `aria-label="갤러리"` |
| Carousel container | `data-testid="photo-carousel"` |
| Each thumbnail `<img>` | `data-testid="photo-thumb-{id}"` |
| Delete overlay | `data-testid="delete-overlay-{id}"` |
| Delete button | `aria-label="사진 삭제"` |

---

## Non-Goals (critical restatements)

- Full-screen photo viewer — REQ-012.
- Undo toast on delete — deferred (MVP keeps deletion immediate, no undo).
- Image auto-resize / compression — v2.
- Multi-file select — single-file only.
- Camera capture attribute — file picker only.
- IndexedDB migration — v2.
- Per-call toast role switching (alert vs status) — single toast instance for MVP.

---

## File Budget (lines per file, target)

| File | Status | Target lines |
|---|---|---|
| `src/lib/storage/photoBase64.ts` | NEW | ≤ 60 |
| `src/lib/hooks/useLongPress.ts` | NEW | ≤ 40 |
| `src/app/diary/[date]/_components/PhotoCarousel.tsx` | NEW | ≤ 90 |
| `src/lib/storage/__tests__/photoBase64.test.ts` | NEW | ≤ 80 |
| `src/lib/hooks/__tests__/useLongPress.test.ts` | NEW | ≤ 70 |
| `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx` | NEW | ≤ 80 |
| `src/lib/hooks/useEditorState.ts` | MODIFY | ~135 (was 110) |
| `src/lib/hooks/useHorizontalDatePicker.ts` | MODIFY | ~107 (was 103) |
| `src/app/diary/[date]/_components/Editor.tsx` | MODIFY | ~230 (was 192) |
| `src/app/diary/[date]/_components/EditorToolbar.tsx` | MODIFY | ~115 (was 108) |

---

## Implementation Order

1. `src/lib/storage/photoBase64.ts` — no deps on new code
2. `src/lib/hooks/useLongPress.ts` — no deps on new code
3. `src/lib/hooks/useEditorState.ts` — add `photos`, `ADD_PHOTO`, `DELETE_PHOTO`
4. `src/lib/hooks/useHorizontalDatePicker.ts` — add `photos` to `AutosaveValue`
5. `src/app/diary/[date]/_components/PhotoCarousel.tsx` — depends on `useLongPress`
6. `src/app/diary/[date]/_components/EditorToolbar.tsx` — add `galleryDisabled` prop
7. `src/app/diary/[date]/_components/Editor.tsx` — wire everything together
8. Tests for all new/modified files
9. E2E: photo add → save → re-enter → photos present

---

## Backward Compatibility

- `AutosaveValue` gains a required `photos` field. Any call site that constructs this object must now include `photos`. The only call sites are `Editor.tsx` (the `useMemo`) and `useHorizontalDatePicker.ts` (internal — not a public API). No external consumers. No breaking change outside this codebase.
- `EditorToolbar` gains `galleryDisabled?: boolean` (optional, defaults to `false`). Existing render snapshots may need updating. No behavior change when prop is absent.
- `useEditorState` gains `photos: Photo[]` in `EditorState`. Existing test fixtures that spread `EditorState` will typecheck correctly because they construct from `useEditorState` return, not manually. `EditorAction` union grows — `default` branch in reducer handles unknown actions safely.
- `saveFn` no longer hardcodes `photos: []`. This changes the stored value for all saves going forward. Existing localStorage entries have `photos: []` (from `fixtures.ts`) so loaded entries will produce `state.photos = []` correctly via `LOAD_ENTRY`. No migration needed.

---

## Performance Considerations

- Base64 encoding a 150 KB dataUrl is synchronous inside `FileReader.onload` — but `FileReader.readAsDataURL` itself is async. No main-thread blocking.
- `Image.onload` for dimension extraction is also async (microtask after dataUrl assignment). Negligible for images already in memory as dataUrl.
- `autosaveValue` useMemo now depends on `state.photos` (array reference). Every `ADD_PHOTO`/`DELETE_PHOTO` dispatch creates a new array, triggering the memo. This is correct and expected — autosave must fire on photo change. No unnecessary re-renders beyond what the debounce absorbs.
- Carousel renders only when `photos.length > 0`. Thumbnails are `<img>` elements with `src={dataUrl}` — the browser decodes already-loaded base64; no network request. Performance acceptable for ≤10 images at 150 KB each.
- Long-press `setTimeout` is a single 500 ms timeout per thumbnail, cleaned up on pointer-up. No memory leak.

---

## Risks and Tradeoffs

1. **localStorage quota**: `MAX_PHOTO_DATAURL_BYTES = 150 KB` per photo × 10 = 1.5 MB per entry. Combined with other entries this can approach the 5 MB cap. The try/catch on `saveFn` and the per-photo size limit are the only guards. No automatic resize. Documented risk per PRD §3.9.

2. **`Editor.tsx` at ~230 lines**: Pre-existing over-budget state worsens by ~38 lines. Accepted for this REQ per the pre-decision that inline is preferable to a `GalleryInput.tsx` sub-component. Filed as a flag for the next REQ to extract.

3. **happy-dom mocking complexity**: `globalThis.Image` and `globalThis.FileReader` mock setup is non-trivial but well-understood. The `ImageCtor` injectable parameter in `addPhotoFromFile` keeps the production path clean. Tests must use `// @vitest-environment happy-dom`.

4. **Overlay tap-outside uses document pointerdown**: This listener fires for ALL pointer events globally while overlay is open. The `overlayRef.contains(e.target)` check prevents false dismissals. The listener is removed immediately when `activeId` clears.

5. **REQ-012 coupling**: `onThumbnailTap` prop is a no-op now. When REQ-012 lands, it wires this prop without touching `PhotoCarousel` internals.

---

## Open Questions

None. All 12 items resolved.

---

## Verdict
PASS
