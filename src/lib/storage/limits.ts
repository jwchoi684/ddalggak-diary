/**
 * Capacity limits enforced by upstream callers (REQ-011 for photos).
 * The storage layer does NOT validate against these — it only documents them.
 * Exceeding them risks `QuotaExceededError` against the ~5 MB localStorage cap.
 */

/**
 * Maximum bytes per Photo.dataUrl (base64-encoded).
 * 150 KB base64 ≈ 112 KB binary — fits a compressed 800×800 JPEG comfortably.
 * 10 photos × 150 KB = 1.5 MB per entry, leaving ~3.5 MB for the rest of the corpus.
 */
export const MAX_PHOTO_DATAURL_BYTES = 150 * 1024;

/**
 * Maximum number of photos per DiaryEntry.photos array.
 * Locked by PRD §9 and §13.2.
 */
export const MAX_PHOTOS_PER_ENTRY = 10;
