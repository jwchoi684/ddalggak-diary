// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useToast } from '@/design-system/useToast';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('useToast', () => {
  it('initial state: open=false and message=""', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.open).toBe(false);
    expect(result.current.message).toBe('');
  });

  it('show() sets open=true and message', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.show('저장됨');
    });
    expect(result.current.open).toBe(true);
    expect(result.current.message).toBe('저장됨');
  });

  it('auto-hides after default 1800ms', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.show('저장됨');
    });
    expect(result.current.open).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(result.current.open).toBe(false);
  });

  it('re-calling show before timer expires resets the timer', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.show('첫 번째');
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });
    // Still open 900ms after first show
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.show('두 번째');
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });
    // 900ms after second show — timer reset, should still be open
    expect(result.current.open).toBe(true);

    act(() => {
      vi.advanceTimersByTime(900);
    });
    // 1800ms from second show — now closed
    expect(result.current.open).toBe(false);
  });

  it('hide() immediately closes and no error after timer would have fired', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.show('테스트');
    });
    act(() => {
      result.current.hide();
    });
    expect(result.current.open).toBe(false);
    // Advance past original duration — no error; timer was cleared
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(result.current.open).toBe(false);
  });
});
