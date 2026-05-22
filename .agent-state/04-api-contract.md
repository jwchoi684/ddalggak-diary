# API / Interface Contract — REQ-011

## Summary

REQ-011 introduces photo attachment to the diary editor. It adds one storage utility (`addPhotoFromFile`), one hook (`useLongPress`), one component (`PhotoCarousel`), two new reducer actions (`ADD_PHOTO`, `DELETE_PHOTO`) with a matching new field (`photos: Photo[]`) in `EditorState`, an extended `AutosaveValue` type, and one new optional prop (`galleryDisabled?: boolean`) on `EditorToolbar`. No HTTP endpoints, RPC methods, or backend changes are involved. All contracts are TypeScript-level, within the client module boundary.

## Contract Type

Internal TypeScript function/hook/component interfaces. No network boundary.

---

## Interfaces

### 1. `addPhotoFromFile` — `src/lib/storage/photoBase64.ts`

```typescript
export interface AddPhotoResult {
  ok: true;
  photo: Photo;
}

export interface AddPhotoError {
  ok: false;
  reason: 'count_exceeded' | 'size_exceeded' | 'load_failed';
}

export type AddPhotoOutcome = AddPhotoResult | AddPhotoError;

export async function addPhotoFromFile(
  file: File,
  currentPhotoCount: number,
  ImageCtor?: typeof Image,
): Promise<AddPhotoOutcome>;
```

Caller responsibilities:
- Pass a `File` from a change event on `<input type="file" accept="image/*">`.
- Pass `state.photos.length` as `currentPhotoCount` at the moment of the call.
- Pass `ImageCtor` only in tests; omit in production.
- Reset `fileInputRef.current.value = ''` before awaiting this function.

Callee guarantees:
- Never throws. Always resolves with `AddPhotoOutcome`.
- Count is checked before FileReader is started. If `currentPhotoCount >= MAX_PHOTOS_PER_ENTRY`, returns `{ ok: false, reason: 'count_exceeded' }` synchronously (wrapped in a resolved promise).
- After FileReader resolves, checks `dataUrl.length > MAX_PHOTO_DATAURL_BYTES`. Returns `{ ok: false, reason: 'size_exceeded' }` if exceeded.
- Extracts `naturalWidth`/`naturalHeight` via `new (ImageCtor ?? globalThis.Image)()`. Returns `{ ok: false, reason: 'load_failed' }` if `img.onerror` fires or FileReader emits an error event.
- On success, returns `{ ok: true, photo }` where `photo` conforms to the `Photo` type: `id` from `generateId()`, `dataUrl`, `width`, `height`, `addedAt` as ISO 8601 string.

Invariants:
- `dataUrl` is always a base64 data URL (`data:image/*;base64,...`). `URL.createObjectURL` is never used.
- Photos appended to the array always appear at the tail (append order, not prepend).

---

### 2. `useLongPress` — `src/lib/hooks/useLongPress.ts`

```typescript
export interface LongPressOptions {
  onLongPress: () => void;
  delayMs?: number;   // default: 500
  slopPx?: number;    // default: 5
}

export interface LongPressHandlers {
  onPointerDown:  (e: React.PointerEvent) => void;
  onPointerUp:    (e: React.PointerEvent) => void;
  onPointerMove:  (e: React.PointerEvent) => void;
  onPointerCancel:(e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
}

export function useLongPress(options: LongPressOptions): LongPressHandlers;
```

Caller responsibilities:
- Spread the returned handlers onto the target element: `<div {...longPressHandlers}>`.
- Provide a stable `onLongPress` reference (wrap in `useCallback`) to avoid spurious re-renders.

Callee guarantees:
- Timer fires `onLongPress` exactly once after `delayMs` ms of uninterrupted hold.
- Timer is cleared on `onPointerUp`, `onPointerCancel`, `onPointerLeave`, and on `onPointerMove` where displacement from `pointerdown` exceeds `slopPx` in any direction.
- No state or timer leaks when the target unmounts (internal `useEffect` cleanup clears any pending timer).
- Does not call `preventDefault` or `stopPropagation` — caller owns event handling.

Invariants:
- Short press (< `delayMs`) never fires `onLongPress`.
- `slopPx` default of 5 prevents accidental long-press during horizontal scroll.

---

### 3. `PhotoCarousel` — `src/app/diary/[date]/_components/PhotoCarousel.tsx`

```typescript
export interface PhotoCarouselProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  /** No-op by default. Wired by REQ-012 for full-screen viewer. */
  onThumbnailTap?: (id: string) => void;
}

export function PhotoCarousel(props: PhotoCarouselProps): React.ReactElement | null;
```

Caller responsibilities:
- Pass `state.photos` directly; do not copy.
- Provide `onDelete` that dispatches `DELETE_PHOTO`.
- Conditionally render only when `photos.length > 0` OR let the component return `null` internally — either is acceptable; the component returns `null` when the array is empty, so double-guarding in the parent is safe but not required.

Callee guarantees:
- Returns `null` when `photos.length === 0`. No DOM nodes rendered.
- Each thumbnail is `88px × 88px`, `border-radius: 12px`, `object-fit: cover`.
- Carousel container: `overflow-x: auto`, `scroll-snap-type: x mandatory`, `gap: 8px`, `padding: 4px`, `no-scrollbar` utility class.
- Each thumbnail wrapper has `scroll-snap-align: start`, `flex-shrink: 0`.
- Long-press (≥ 500 ms) sets an active overlay on that thumbnail and calls `navigator.vibrate(50)` with feature detection (`if (navigator.vibrate)`).
- Tapping outside the active overlay (`document` pointerdown, `!overlayRef.contains(e.target)`) clears `activeId`. The listener is attached only when `activeId !== null` and removed on cleanup.
- Tapping "삭제" in the overlay calls `onDelete(photo.id)` immediately; no secondary confirmation for MVP.
- Short tap (< 500 ms) calls `onThumbnailTap(photo.id)` if provided; otherwise no-op.

Test selectors:
- Carousel container: `data-testid="photo-carousel"`, `role="list"`
- Each thumbnail `<img>`: `data-testid="photo-thumb-{id}"`, `alt="첨부 사진"`, wrapper `role="listitem"`
- Delete overlay: `data-testid="delete-overlay-{id}"`
- Delete button: `aria-label="사진 삭제"`, `role="button"`, `min-h-[44px] min-w-[44px]`

Visual spec:
- Overlay background: `rgba(0, 0, 0, 0.45)`. Not brand peach.
- Overlay `border-radius: 12px` (matches thumbnail).
- Delete button: `text-white text-sm font-medium`.

---

### 4. `useEditorState` reducer additions — `src/lib/hooks/useEditorState.ts`

```typescript
// EditorState addition:
photos: Photo[];

// EditorAction union additions:
| { type: 'ADD_PHOTO'; photo: Photo }
| { type: 'DELETE_PHOTO'; id: string }
```

Reducer semantics:
- `ADD_PHOTO`: returns `{ ...state, photos: [...state.photos, action.photo] }`.
- `DELETE_PHOTO`: returns `{ ...state, photos: state.photos.filter(p => p.id !== action.id) }`.
- `LOAD_ENTRY`: spreads `action.entry.photos ?? []` into state.
- `MARK_SAVED` snapshot: remains `{ mood, text, textAlign }` — photos are excluded from dirty detection.
- `INITIAL_STATE`: `photos: []`.

Invariants:
- `ADD_PHOTO` never validates count — count guard is in `addPhotoFromFile` and `handleGalleryTap`. The reducer is always called with a pre-validated `Photo`.
- `DELETE_PHOTO` is idempotent if the `id` is not found (filter returns unchanged array).
- `photos` is never `undefined`; it is always an array.

---

### 5. `AutosaveValue` type extension — `src/lib/hooks/useHorizontalDatePicker.ts`

```typescript
export type AutosaveValue = {
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  photos: Photo[];   // NEW — required field
};
```

Caller responsibilities:
- Every construction of `AutosaveValue` (the `useMemo` in `Editor.tsx`) must include `photos: state.photos`.
- `useHorizontalDatePicker` passes `autosaveValue` to `saveFn` on date-switch. Photos at the moment of switch are included — this is correct behavior.

Callee guarantees:
- No behavior change inside `useHorizontalDatePicker` beyond accepting and forwarding the field.

Backward compatibility note:
- This is a **required field addition** on an internal type. There are no external consumers. The only construction site is `Editor.tsx`. TypeScript will catch any missed update at compile time.

---

### 6. `EditorToolbar` — new prop `galleryDisabled?: boolean`

```typescript
// Addition to EditorToolbarProps:
galleryDisabled?: boolean;   // default: false
```

Caller responsibilities:
- Pass `galleryDisabled={state.photos.length >= MAX_PHOTOS_PER_ENTRY}`.

Callee guarantees:
- When `true`: sets `disabled` HTML attribute on the gallery `<button>`, applies `opacity-50 cursor-not-allowed` Tailwind classes, and sets `aria-disabled="true"` (implied by native `disabled`).
- When `false` or absent: no behavioral or visual change.
- Existing `onGalleryTap`, `aria-label="갤러리"`, `min-h-[44px] min-w-[44px]`, and `text-meta` color are unchanged.

Backward compatibility: optional prop, safe default. Existing snapshots referencing `EditorToolbar` may need updating because the rendered DOM differs when `galleryDisabled` is true. No breaking change when prop is absent.

---

## Storage Contracts

| Constant | Location | Value | Enforcement point |
|---|---|---|---|
| `MAX_PHOTOS_PER_ENTRY` | `src/lib/storage/limits.ts` (exported via `index.ts`) | `10` | `addPhotoFromFile` + `handleGalleryTap` |
| `MAX_PHOTO_DATAURL_BYTES` | `src/lib/storage/limits.ts` (exported via `index.ts`) | `150 * 1024` (153 600) | `addPhotoFromFile` after FileReader resolves |

These constants are the single source of truth. Do not hardcode numeric literals in component or hook code.

`upsertDiary` may throw `QuotaExceededError` (a `DOMException`) when localStorage is full. `saveFn` in `Editor.tsx` must wrap the call in `try/catch` and show the toast `"저장에 실패했어요. 다시 시도해주세요."` on any thrown error. `MARK_SAVED` must not be dispatched when the catch branch executes.

---

## Korean Error / Toast Strings (exact, source of truth)

| Scenario | Exact string |
|---|---|
| `photos.length >= MAX_PHOTOS_PER_ENTRY` | `"최대 10장입니다"` |
| `dataUrl.length > MAX_PHOTO_DATAURL_BYTES` | `"파일이 너무 큽니다"` |
| Image load failure (`img.onerror` / FileReader error) | `"사진을 불러오지 못했어요"` |
| `QuotaExceededError` from `upsertDiary` | `"저장에 실패했어요. 다시 시도해주세요."` |
| Delete overlay button label | `"삭제"` (visible text) |
| Delete overlay aria-label | `"사진 삭제"` |
| Gallery button aria-label | `"갤러리"` (unchanged) |
| Thumbnail alt text | `"첨부 사진"` |

---

## Validation Rules

- Count: `currentPhotoCount >= MAX_PHOTOS_PER_ENTRY` → reject before FileReader.
- Size: `dataUrl.length > MAX_PHOTO_DATAURL_BYTES` → reject after FileReader resolves.
- Image decode: `img.onerror` → reject with `reason: 'load_failed'`.
- FileReader error: `reader.onerror` → reject with `reason: 'load_failed'`.
- Duplicate processing guard: `isProcessing.current === true` in `handleGalleryTap` → silent no-op (no toast).
- Long-press slop: pointer displacement `> slopPx` (default 5 px) cancels timer → overlay not shown.
- `dataUrl` format: must be a base64 data URL. Blob URLs are disallowed.
- File input: `accept="image/*"`, no `multiple` attribute. Single-file selection only.

---

## Error Handling

- All errors from `addPhotoFromFile` are surfaced as `AddPhotoError` objects (no thrown exceptions). The caller (`handleFileChange`) is responsible for showing the appropriate toast.
- `upsertDiary` errors are caught in `saveFn` via try/catch. Any `Error` (not just `QuotaExceededError`) causes the error toast and skips `MARK_SAVED`.
- `navigator.vibrate` is called only after `if (navigator.vibrate)` feature detection; no error handling needed.

---

## Auth / Permission Rules

Not applicable. No network calls. No authentication boundary.

---

## Backward Compatibility

| Change | Impact | Safe? |
|---|---|---|
| `EditorState` gains `photos: Photo[]` | All existing test fixtures construct state via `useEditorState` return or spread — TypeScript catches missing field | Yes, if `INITIAL_STATE.photos = []` |
| `EditorAction` union grows | `default` branch in reducer handles unknown actions safely | Yes |
| `AutosaveValue` gains `photos: Photo[]` (required) | Single construction site in `Editor.tsx` — TypeScript enforces update | Yes, compile-time safe |
| `EditorToolbar` gains `galleryDisabled?: boolean` | Optional; defaults to `false`; no behavior change when absent | Yes |
| `saveFn` no longer hardcodes `photos: []` | Existing localStorage entries have `photos: []`; `LOAD_ENTRY` spreads `entry.photos ?? []` | No migration needed |

---

## Verdict
PASS
