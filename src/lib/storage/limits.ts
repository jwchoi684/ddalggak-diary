/**
 * Capacity limits enforced by upstream callers (REQ-011 for photos).
 * The storage layer does NOT validate against these — it only documents them.
 * Exceeding them risks `QuotaExceededError` against the ~5 MB localStorage cap.
 */

/**
 * Maximum bytes per Photo.dataUrl (base64-encoded).
 *
 * 500 KB base64 ≈ 375 KB binary. iPhone JPEGs were getting rejected at the old
 * 150 KB cap even after on-the-fly compression because the LLM-friendly source
 * dims don't go much below 700px × 0.4 quality. Bumping to 500 KB lets the
 * compressor land naturally — 10 photos × 500 KB = 5 MB still fits the
 * single-entry budget when you don't also have a lot of text.
 */
export const MAX_PHOTO_DATAURL_BYTES = 500 * 1024;

/**
 * Maximum number of photos per DiaryEntry.photos array.
 * Locked by PRD §9 and §13.2.
 */
export const MAX_PHOTOS_PER_ENTRY = 10;
