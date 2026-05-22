// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MAX_PHOTO_DATAURL_BYTES, MAX_PHOTOS_PER_ENTRY } from '@/lib/storage';

// We import the module under test after setting up mocks
const { addPhotoFromFile } = await import('@/lib/storage/photoBase64');

// ─── FileReader stub ──────────────────────────────────────────────────────────

type FROnLoad = ((e: ProgressEvent<FileReader>) => void) | null;
type FROnError = ((e: ProgressEvent<FileReader>) => void) | null;

class OkFileReader {
  result: string | null = null;
  onload: FROnLoad = null;
  onerror: FROnError = null;
  readAsDataURL(_file: Blob) {
    this.result = 'data:image/png;base64,abc123';
    this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>);
  }
}

class ErrorFileReader {
  result: string | null = null;
  onload: FROnLoad = null;
  onerror: FROnError = null;
  readAsDataURL(_file: Blob) {
    this.onerror?.({} as ProgressEvent<FileReader>);
  }
}

// ─── Image stub ───────────────────────────────────────────────────────────────

class OkImage {
  naturalWidth = 100;
  naturalHeight = 80;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    this.onload?.();
  }
}

class ErrorImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    this.onerror?.();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFile(name = 'test.png', type = 'image/png'): File {
  return new File(['x'], name, { type });
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Default: success FileReader
  vi.stubGlobal('FileReader', OkFileReader);
});

describe('addPhotoFromFile', () => {
  it('PB1: count_exceeded when currentPhotoCount >= MAX_PHOTOS_PER_ENTRY', async () => {
    const frSpy = vi.spyOn(OkFileReader.prototype, 'readAsDataURL');
    const result = await addPhotoFromFile(makeFile(), MAX_PHOTOS_PER_ENTRY, OkImage as unknown as typeof Image);
    expect(result).toEqual({ ok: false, reason: 'count_exceeded' });
    expect(frSpy).not.toHaveBeenCalled();
  });

  it('PB2: size_exceeded when dataUrl.length > MAX_PHOTO_DATAURL_BYTES', async () => {
    const prefix = 'data:image/png;base64,';
    const padding = 'A'.repeat(MAX_PHOTO_DATAURL_BYTES + 1 - prefix.length);
    class BigFileReader {
      result: string | null = null;
      onload: FROnLoad = null;
      onerror: FROnError = null;
      readAsDataURL(_file: Blob) {
        this.result = prefix + padding;
        this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    }
    vi.stubGlobal('FileReader', BigFileReader);
    const result = await addPhotoFromFile(makeFile(), 0, OkImage as unknown as typeof Image);
    expect(result).toEqual({ ok: false, reason: 'size_exceeded' });
  });

  it('PB3: load_failed when ImageCtor onerror fires', async () => {
    const result = await addPhotoFromFile(makeFile(), 0, ErrorImage as unknown as typeof Image);
    expect(result).toEqual({ ok: false, reason: 'load_failed' });
  });

  it('PB4: load_failed when FileReader onerror fires', async () => {
    vi.stubGlobal('FileReader', ErrorFileReader);
    const result = await addPhotoFromFile(makeFile(), 0, OkImage as unknown as typeof Image);
    expect(result).toEqual({ ok: false, reason: 'load_failed' });
  });

  it('PB5: returns ok photo with correct shape on success', async () => {
    const result = await addPhotoFromFile(makeFile(), 0, OkImage as unknown as typeof Image);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.photo.id).toBe('string');
    expect(result.photo.id.length).toBeGreaterThan(0);
    expect(typeof result.photo.dataUrl).toBe('string');
    expect(result.photo.dataUrl.startsWith('data:')).toBe(true);
    expect(typeof result.photo.width).toBe('number');
    expect(typeof result.photo.height).toBe('number');
    // ISO 8601 check
    expect(isNaN(Date.parse(result.photo.addedAt))).toBe(false);
  });

  it('PB7: load_failed when FileReader returns a non-image MIME prefix', async () => {
    class NonImageFileReader {
      result: string | null = null;
      onload: FROnLoad = null;
      onerror: FROnError = null;
      readAsDataURL(_file: Blob) {
        this.result = 'data:text/html,<script>alert(1)</script>';
        this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    }
    vi.stubGlobal('FileReader', NonImageFileReader);
    const result = await addPhotoFromFile(makeFile(), 0, OkImage as unknown as typeof Image);
    expect(result).toEqual({ ok: false, reason: 'load_failed' });
  });

  it('PB6: two sequential calls produce distinct photo.id values', async () => {
    const r1 = await addPhotoFromFile(makeFile(), 0, OkImage as unknown as typeof Image);
    const r2 = await addPhotoFromFile(makeFile(), 0, OkImage as unknown as typeof Image);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.photo.id).not.toBe(r2.photo.id);
  });
});
