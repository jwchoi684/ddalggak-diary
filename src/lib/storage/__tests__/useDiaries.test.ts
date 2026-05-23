// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { makeDiary } from './fixtures';

// Mock the Supabase-backed CRUD module — useDiaries now reads from it, not
// from localStorage. We also mock readDiaries (legacy local) so the migration
// branch in the hook can be exercised without touching real localStorage.
vi.mock('@/lib/storage/diaries-remote', () => ({
  listDiariesRemote: vi.fn(async () => []),
  upsertDiaryRemote: vi.fn(async () => undefined),
  removeDiaryRemote: vi.fn(async () => undefined),
}));

vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...original,
    readDiaries: vi.fn(() => []),
    writeAllDiaries: vi.fn(),
  };
});

const { listDiariesRemote } = await import('@/lib/storage/diaries-remote');
const listMock = listDiariesRemote as ReturnType<typeof vi.fn>;

const { useDiaries } = await import('@/lib/storage/useDiaries');

beforeEach(() => {
  listMock.mockReset();
  listMock.mockResolvedValue([]);
  // Ensure the migration branch is treated as already done so it doesn't
  // perturb the test expectations.
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('ddalkkak:diaries:migrated-to-supabase:v1', '1');
  }
});

describe('useDiaries (Supabase-backed)', () => {
  it('after mount, isReady=true and entries comes from listDiariesRemote', async () => {
    const diary = makeDiary();
    listMock.mockResolvedValue([diary]);
    const { result } = renderHook(() => useDiaries());
    await act(async () => {});
    expect(result.current.isReady).toBe(true);
    expect(result.current.entries).toEqual([diary]);
  });

  it('isReady=true with empty entries when the remote list is empty', async () => {
    listMock.mockResolvedValue([]);
    const { result } = renderHook(() => useDiaries());
    await act(async () => {});
    expect(result.current.isReady).toBe(true);
    expect(result.current.entries).toEqual([]);
  });

  it('sets entries.length=3 when listDiariesRemote returns 3 entries', async () => {
    listMock.mockResolvedValue([makeDiary(), makeDiary(), makeDiary()]);
    const { result } = renderHook(() => useDiaries());
    await act(async () => {});
    expect(result.current.isReady).toBe(true);
    expect(result.current.entries).toHaveLength(3);
  });
});
