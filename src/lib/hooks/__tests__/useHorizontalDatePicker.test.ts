// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return { ...original, readDiaries: vi.fn(() => []), upsertDiary: vi.fn() };
});

const { readDiaries } = await import('@/lib/storage');
const readDiariesMock = readDiaries as ReturnType<typeof vi.fn>;
const { useHorizontalDatePicker } = await import('@/lib/hooks/useHorizontalDatePicker');
const { makeDiary } = await import('@/lib/storage/__tests__/fixtures');

beforeEach(() => {
  vi.clearAllMocks();
  readDiariesMock.mockReturnValue([]);
});
afterEach(() => {
  cleanup();
});

describe('useHorizontalDatePicker', () => {
  it('H1: isOpen starts false; toggle() opens the strip', () => {
    const { result } = renderHook(() =>
      useHorizontalDatePicker({
        currentDate: '2026-05-22',
        saveFn: vi.fn(),
        autosaveValue: { mood: 'joy', text: '', textAlign: 'left', photos: [] },
        onDateChange: vi.fn(),
        onSaveError: vi.fn(),
      }),
    );
    expect(result.current.isOpen).toBe(false);
    act(() => { result.current.toggle(); });
    expect(result.current.isOpen).toBe(true);
  });

  it('H2: close() returns isOpen to false', () => {
    const { result } = renderHook(() =>
      useHorizontalDatePicker({
        currentDate: '2026-05-22',
        saveFn: vi.fn(),
        autosaveValue: { mood: 'joy', text: '', textAlign: 'left', photos: [] },
        onDateChange: vi.fn(),
        onSaveError: vi.fn(),
      }),
    );
    act(() => { result.current.toggle(); }); // open
    act(() => { result.current.close(); });  // close
    expect(result.current.isOpen).toBe(false);
  });

  it('H3: dateRange is 61 items, sorted ascending, currentDate is at index 30', () => {
    const { result } = renderHook(() =>
      useHorizontalDatePicker({
        currentDate: '2026-05-22',
        saveFn: vi.fn(),
        autosaveValue: { mood: undefined, text: '', textAlign: 'left', photos: [] },
        onDateChange: vi.fn(),
        onSaveError: vi.fn(),
      }),
    );
    const { dateRange } = result.current;
    expect(dateRange).toHaveLength(61);
    // sorted ascending
    for (let i = 1; i < dateRange.length; i++) {
      expect(dateRange[i] > dateRange[i - 1]).toBe(true);
    }
    // currentDate is at the midpoint
    expect(dateRange[30]).toBe('2026-05-22');
    // boundaries
    expect(dateRange[0]).toBe('2026-04-22');
    expect(dateRange[60]).toBe('2026-06-21');
  });

  it('H4: entryMap is populated from readDiaries on open', () => {
    const entry = makeDiary({ date: '2026-05-22', mood: 'joy' });
    readDiariesMock.mockReturnValue([entry]);

    const { result } = renderHook(() =>
      useHorizontalDatePicker({
        currentDate: '2026-05-22',
        saveFn: vi.fn(),
        autosaveValue: { mood: 'joy', text: '', textAlign: 'left', photos: [] },
        onDateChange: vi.fn(),
        onSaveError: vi.fn(),
      }),
    );

    // entryMap computed via useMemo([isOpen]) — check after open
    act(() => { result.current.toggle(); });
    expect(result.current.entryMap.get('2026-05-22')).toMatchObject({ date: '2026-05-22', mood: 'joy' });
  });

  it('H5: handleDateSelect happy path — onDateChange fires with newDate, strip closes (saveFn is the caller-owned new-date save)', () => {
    const saveFn = vi.fn();
    const onDateChange = vi.fn();
    const onSaveError = vi.fn();

    const { result } = renderHook(() =>
      useHorizontalDatePicker({
        currentDate: '2026-05-22',
        saveFn,
        autosaveValue: { mood: 'joy', text: 'hello', textAlign: 'left', photos: [] },
        onDateChange,
        onSaveError,
      }),
    );

    act(() => { result.current.toggle(); }); // open
    act(() => { result.current.handleDateSelect('2026-05-23'); });

    // saveFn is NOT called by the hook on a different-date tap: that would save
    // the draft at the OLD date (saveFn is bound to the old currentDate). The
    // caller's onDateChange is now responsible for the new-date persist.
    expect(saveFn).not.toHaveBeenCalled();
    expect(onDateChange).toHaveBeenCalledWith('2026-05-23');
    expect(onSaveError).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it('H6: different-date tap always fires onDateChange + closes; saveFn errors are the caller\'s concern', () => {
    // saveFn would throw if invoked, but the hook no longer invokes it on a
    // different-date tap, so the navigation still proceeds. The caller's
    // onDateChange owns persistence and surfaces its own errors.
    const quotaError = Object.assign(new DOMException('QuotaExceededError'), { name: 'QuotaExceededError' });
    const saveFn = vi.fn(() => { throw quotaError; });
    const onDateChange = vi.fn();
    const onSaveError = vi.fn();

    const { result } = renderHook(() =>
      useHorizontalDatePicker({
        currentDate: '2026-05-22',
        saveFn,
        autosaveValue: { mood: 'joy', text: 'hello', textAlign: 'left', photos: [] },
        onDateChange,
        onSaveError,
      }),
    );

    act(() => { result.current.toggle(); });
    act(() => { result.current.handleDateSelect('2026-05-23'); });

    expect(saveFn).not.toHaveBeenCalled();
    expect(onSaveError).not.toHaveBeenCalled();
    expect(onDateChange).toHaveBeenCalledWith('2026-05-23');
    expect(result.current.isOpen).toBe(false);
  });

  it('H7: same-date tap — saveFn called (no-op if no mood), onDateChange skipped, strip closes', () => {
    const saveFn = vi.fn();
    const onDateChange = vi.fn();

    const { result } = renderHook(() =>
      useHorizontalDatePicker({
        currentDate: '2026-05-22',
        saveFn,
        autosaveValue: { mood: 'joy', text: '', textAlign: 'left', photos: [] },
        onDateChange,
        onSaveError: vi.fn(),
      }),
    );

    act(() => { result.current.toggle(); });
    act(() => { result.current.handleDateSelect('2026-05-22'); }); // same date

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(onDateChange).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });
});
