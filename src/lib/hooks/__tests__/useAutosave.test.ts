// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAutosave } from '@/lib/hooks/useAutosave';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('useAutosave', () => {
  it('does not call saveFn before delayMs elapses', () => {
    const saveFn = vi.fn();
    renderHook(() => useAutosave('hello', 1000, saveFn));
    act(() => { vi.advanceTimersByTime(999); });
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('calls saveFn exactly once after delayMs elapses', () => {
    const saveFn = vi.fn();
    renderHook(() => useAutosave('hello', 1000, saveFn));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on value change before delayMs', () => {
    const saveFn = vi.fn();
    const { rerender } = renderHook(
      ({ value }) => useAutosave(value, 1000, saveFn),
      { initialProps: { value: 'a' } },
    );
    act(() => { vi.advanceTimersByTime(800); });
    act(() => { rerender({ value: 'ab' }); });
    act(() => { vi.advanceTimersByTime(800); }); // 800ms since rerender
    expect(saveFn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); }); // now 1000ms since last change
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  it('does not call saveFn after unmount', () => {
    const saveFn = vi.fn();
    const { unmount } = renderHook(() => useAutosave('hello', 1000, saveFn));
    act(() => { vi.advanceTimersByTime(500); });
    unmount();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('passes the latest value to saveFn', () => {
    const saveFn = vi.fn();
    const { rerender } = renderHook(
      ({ value }) => useAutosave(value, 1000, saveFn),
      { initialProps: { value: 'first' } },
    );
    act(() => { rerender({ value: 'second' }); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(saveFn).toHaveBeenCalledWith('second');
  });
});
