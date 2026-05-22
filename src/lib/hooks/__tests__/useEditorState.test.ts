// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

// Storage mock must be declared before any imports that use @/lib/storage
vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return { ...original, readDiaries: vi.fn(() => []) };
});

const { readDiaries } = await import('@/lib/storage');
const readDiariesMock = readDiaries as ReturnType<typeof vi.fn>;

const { useEditorState } = await import('@/lib/hooks/useEditorState');
const { makeDiary } = await import('@/lib/storage/__tests__/fixtures');

// Install LocalStorageShim (pattern check / defensive)
await import('@/lib/storage/__tests__/setup');

beforeEach(() => {
  readDiariesMock.mockReturnValue([]);
});

afterEach(() => {
  cleanup();
});

describe('useEditorState', () => {
  it('initial state has correct empty shape before LOAD_ENTRY fires', () => {
    const { result } = renderHook(() => useEditorState('2026-05-15'));
    // Synchronous initial state before useEffect fires
    expect(result.current[0].text).toBe('');
    expect(result.current[0].mood).toBeUndefined();
    expect(result.current[0].textAlign).toBe('left');
    expect(result.current[0].persistedId).toBeUndefined();
    expect(result.current[0].moreMenuOpen).toBe(false);
    expect(result.current[0].unsavedDialogOpen).toBe(false);
    expect(result.current[0].deleteDialogOpen).toBe(false);
  });

  it('empty storage → isLoaded=true, moodSheetMode="initial"', async () => {
    readDiariesMock.mockReturnValue([]);
    const { result } = renderHook(() => useEditorState('2026-05-15'));
    await act(async () => {});
    expect(result.current[0].isLoaded).toBe(true);
    expect(result.current[0].moodSheetMode).toBe('initial');
    expect(result.current[0].mood).toBeUndefined();
    expect(result.current[0].text).toBe('');
  });

  it('existing entry → fields prefilled, moodSheetMode="closed"', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'sad', text: 'yesterday' });
    readDiariesMock.mockReturnValue([entry]);
    const { result } = renderHook(() => useEditorState('2026-05-15'));
    await act(async () => {});
    const [state] = result.current;
    expect(state.isLoaded).toBe(true);
    expect(state.mood).toBe('sad');
    expect(state.text).toBe('yesterday');
    expect(state.textAlign).toBe(entry.textAlign);
    expect(state.persistedId).toBe(entry.id);
    expect(state.persistedCreatedAt).toBe(entry.createdAt);
    expect(state.moodSheetMode).toBe('closed');
    expect(state.snapshot).toEqual({ mood: 'sad', text: 'yesterday', textAlign: entry.textAlign });
  });

  it('SET_TEXT makes isDirty=true; reverting to original makes isDirty=false', async () => {
    const entry = makeDiary({ date: '2026-05-15', text: 'original' });
    readDiariesMock.mockReturnValue([entry]);
    const { result } = renderHook(() => useEditorState('2026-05-15'));
    await act(async () => {});

    const isDirty = (s: (typeof result.current)[0]) =>
      s.isLoaded && (
        s.mood !== s.snapshot.mood ||
        s.text !== s.snapshot.text ||
        s.textAlign !== s.snapshot.textAlign
      );

    expect(isDirty(result.current[0])).toBe(false);

    act(() => { result.current[1]({ type: 'SET_TEXT', text: 'changed' }); });
    expect(isDirty(result.current[0])).toBe(true);

    act(() => { result.current[1]({ type: 'SET_TEXT', text: 'original' }); });
    expect(isDirty(result.current[0])).toBe(false);
  });

  it('MARK_SAVED resets snapshot → isDirty=false after save', async () => {
    const entry = makeDiary({ date: '2026-05-15', text: 'original' });
    readDiariesMock.mockReturnValue([entry]);
    const { result } = renderHook(() => useEditorState('2026-05-15'));
    await act(async () => {});
    const [, dispatch] = result.current;

    act(() => { dispatch({ type: 'SET_TEXT', text: 'changed' }); });

    const isDirty = (s: (typeof result.current)[0]) =>
      s.isLoaded && (
        s.mood !== s.snapshot.mood ||
        s.text !== s.snapshot.text ||
        s.textAlign !== s.snapshot.textAlign
      );

    expect(isDirty(result.current[0])).toBe(true);

    act(() => {
      dispatch({ type: 'MARK_SAVED', id: entry.id, createdAt: entry.createdAt });
    });
    expect(isDirty(result.current[0])).toBe(false);
    expect(result.current[0].snapshot.text).toBe('changed');
  });
});
