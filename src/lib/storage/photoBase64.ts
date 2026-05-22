import { generateId, MAX_PHOTO_DATAURL_BYTES, MAX_PHOTOS_PER_ENTRY } from '@/lib/storage';
import type { Photo } from '@/lib/storage';

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

function getDimensions(dataUrl: string, Ctor: typeof Image): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Ctor();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Image decode error'));
    img.src = dataUrl;
  });
}

/**
 * Reads file as base64 data URL, extracts dimensions, validates limits.
 * Never throws — always resolves with AddPhotoOutcome.
 * ImageCtor is injectable for tests (defaults to globalThis.Image).
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

  if (dataUrl.length > MAX_PHOTO_DATAURL_BYTES) return { ok: false, reason: 'size_exceeded' };

  let dims: { width: number; height: number };
  try { dims = await getDimensions(dataUrl, ImageCtor ?? globalThis.Image); }
  catch { return { ok: false, reason: 'load_failed' }; }

  return { ok: true, photo: { id: generateId(), dataUrl, width: dims.width, height: dims.height, addedAt: new Date().toISOString() } };
}
