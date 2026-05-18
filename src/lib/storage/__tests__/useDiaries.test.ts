// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { makeDiary } from './fixtures';

// Mock @/lib/storage before importing the hook
vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...original,
    readDiaries: vi.fn(() => []),
  };
});

const { readDiaries } = await import('@/lib/storage');
const readDiariesMock = readDiaries as ReturnType<typeof vi.fn>;

const { useDiaries } = await import('@/lib/storage/useDiaries');

describe('useDiaries — initial state', () => {
  beforeEach(() => {
    readDiariesMock.mockReturnValue([]);
  });

  it('isReady and entries are set after renderHook (effects run during render in happy-dom)', async () => {
    // happy-dom flushes useEffect synchronously inside renderHook.
    // After the hook renders and effects fire, isReady transitions to true.
    const { result } = renderHook(() => useDiaries());
    await act(async () => {});
    // isReady must be true after effects; entries come from readDiaries mock (empty)
    expect(result.current.isReady).toBe(true);
    expect(result.current.entries).toEqual([]);
  });
});

describe('useDiaries — after mount effect', () => {
  beforeEach(() => {
    readDiariesMock.mockReturnValue([]);
  });

  it('sets isReady=true and entries from readDiaries after effect flushes', async () => {
    const diary = makeDiary();
    readDiariesMock.mockReturnValue([diary]);
    const { result } = renderHook(() => useDiaries());
    await act(async () => {});
    expect(result.current.isReady).toBe(true);
    expect(result.current.entries).toEqual([diary]);
  });

  it('sets isReady=true and entries=[] when readDiaries returns []', async () => {
    readDiariesMock.mockReturnValue([]);
    const { result } = renderHook(() => useDiaries());
    await act(async () => {});
    expect(result.current.isReady).toBe(true);
    expect(result.current.entries).toEqual([]);
  });

  it('sets entries.length=3 when readDiaries returns 3 entries', async () => {
    readDiariesMock.mockReturnValue([makeDiary(), makeDiary(), makeDiary()]);
    const { result } = renderHook(() => useDiaries());
    await act(async () => {});
    expect(result.current.isReady).toBe(true);
    expect(result.current.entries).toHaveLength(3);
  });
});
