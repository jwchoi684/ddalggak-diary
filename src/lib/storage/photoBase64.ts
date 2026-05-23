import { generateId, MAX_PHOTO_DATAURL_BYTES, MAX_PHOTOS_PER_ENTRY } from '@/lib/storage';
import type { Photo } from '@/lib/storage';
import { uploadPhotoToStorage } from '@/lib/storage/photos-remote';

export interface AddPhotoResult { ok: true; photo: Photo }
export interface AddPhotoError { ok: false; reason: 'count_exceeded' | 'size_exceeded' | 'load_failed' }
export type AddPhotoOutcome = AddPhotoResult | AddPhotoError;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => {
      if (typeof e.target?.result !== 'string') { reject(new Error('FileReader result not a string')); return; }
      resolve(e.target.result);
    };
    r.onerror = () => reject(new Error('FileReader error'));
    r.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string, Ctor: typeof Image): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Ctor();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode error'));
    img.src = dataUrl;
  });
}

/**
 * Re-encode an image into a smaller JPEG so it fits localStorage. iPhone HEIC
 * shots routinely produce 3-5 MB JPEGs (≈ 7 MB as base64), which blow past the
 * MAX_PHOTO_DATAURL_BYTES cap. We progressively downscale + drop quality until
 * the result fits, or give up if it never does.
 *
 * Returns the compressed dataUrl + final dimensions, or null if compression
 * isn't available in this environment (no canvas — SSR/tests/older WebViews).
 */
async function compressImage(
  img: HTMLImageElement,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof document === 'undefined') return null;

  // Target dims try, in order. JPEG quality steps within each dim.
  const dimAttempts = [1600, 1200, 900, 700];
  const qualityAttempts = [0.85, 0.7, 0.55, 0.4];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  for (const maxDim of dimAttempts) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of qualityAttempts) {
      const compressed = canvas.toDataURL('image/jpeg', q);
      if (compressed.length <= MAX_PHOTO_DATAURL_BYTES) {
        return { dataUrl: compressed, width: w, height: h };
      }
    }
  }
  return null;
}

/**
 * Reads file as base64 data URL, compresses if it overflows the storage cap,
 * and returns the resulting Photo. Never throws — always resolves with
 * AddPhotoOutcome. ImageCtor is injectable for tests (defaults to Image).
 */
export async function addPhotoFromFile(
  file: File,
  currentPhotoCount: number,
  ImageCtor?: typeof Image,
): Promise<AddPhotoOutcome> {
  if (currentPhotoCount >= MAX_PHOTOS_PER_ENTRY) return { ok: false, reason: 'count_exceeded' };

  let dataUrl: string;
  try { dataUrl = await readAsDataUrl(file); }
  catch { return { ok: false, reason: 'load_failed' }; }

  if (!dataUrl.startsWith('data:image/')) return { ok: false, reason: 'load_failed' };

  let img: HTMLImageElement;
  try { img = await loadImage(dataUrl, ImageCtor ?? globalThis.Image); }
  catch { return { ok: false, reason: 'load_failed' }; }

  let finalDataUrl = dataUrl;
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  // Compress when the raw upload is too big (iPhone case). Skip when small
  // enough already so we don't lossily re-encode tiny PNGs.
  if (dataUrl.length > MAX_PHOTO_DATAURL_BYTES) {
    const compressed = await compressImage(img);
    if (!compressed) return { ok: false, reason: 'size_exceeded' };
    finalDataUrl = compressed.dataUrl;
    width = compressed.width;
    height = compressed.height;
  }

  // Phase 3 — upload to Supabase Storage instead of carrying base64 around
  // in the diary row. If the upload fails, fall back to the data URL so the
  // editor still works offline.
  const photoId = generateId();
  let publicDataUrl = finalDataUrl;
  let storagePath: string | undefined;
  try {
    const uploadFile = await dataUrlToFile(finalDataUrl, photoId);
    const uploaded = await uploadPhotoToStorage(uploadFile, photoId);
    publicDataUrl = uploaded.publicUrl;
    storagePath = uploaded.storagePath;
  } catch (err) {
    console.warn('[addPhotoFromFile] storage upload failed, using inline base64', err);
  }

  return {
    ok: true,
    photo: {
      id: photoId,
      dataUrl: publicDataUrl,
      storagePath,
      width,
      height,
      addedAt: new Date().toISOString(),
    },
  };
}

/** Converts a data URL string into a File suitable for Storage upload. */
async function dataUrlToFile(dataUrl: string, baseName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = (blob.type.split('/')[1] ?? 'jpg').split(';')[0];
  return new File([blob], `${baseName}.${ext}`, { type: blob.type || 'image/jpeg' });
}
