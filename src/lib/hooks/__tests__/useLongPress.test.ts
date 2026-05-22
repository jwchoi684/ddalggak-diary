// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup, fireEvent } from '@testing-library/react';
import { useLongPress } from '@/lib/hooks/useLongPress';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function makePointerEvent(type: string, overrides: Partial<PointerEventInit> = {}): PointerEvent {
  return new PointerEvent(type, { bubbles: true, clientX: 0, clientY: 0, ...overrides });
}

describe('useLongPress', () => {
  it('LP1: onLongPress fires exactly once after default 500ms', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    const fakeEvent = makePointerEvent('pointerdown');
    act(() => { result.current.onPointerDown(fakeEvent as unknown as React.PointerEvent); });

    act(() => { vi.advanceTimersByTime(500); });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('LP2: onLongPress does NOT fire when pointerup dispatched before 500ms', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    const down = makePointerEvent('pointerdown');
    act(() => { result.current.onPointerDown(down as unknown as React.PointerEvent); });

    act(() => { vi.advanceTimersByTime(400); });

    const up = makePointerEvent('pointerup');
    act(() => { result.current.onPointerUp(up as unknown as React.PointerEvent); });

    act(() => { vi.advanceTimersByTime(200); });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('LP3: onLongPress does NOT fire when pointermove exceeds slopPx before timer', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, slopPx: 5 }));

    const down = makePointerEvent('pointerdown', { clientX: 0, clientY: 0 });
    act(() => { result.current.onPointerDown(down as unknown as React.PointerEvent); });

    const move = makePointerEvent('pointermove', { clientX: 10, clientY: 0 });
    act(() => { result.current.onPointerMove(move as unknown as React.PointerEvent); });

    act(() => { vi.advanceTimersByTime(600); });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('LP4: timer cancelled on pointerCancel and pointerLeave independently', () => {
    const onLongPress = vi.fn();

    // Test pointerCancel
    const { result: r1 } = renderHook(() => useLongPress({ onLongPress }));
    const down1 = makePointerEvent('pointerdown');
    act(() => { r1.current.onPointerDown(down1 as unknown as React.PointerEvent); });
    const cancel = makePointerEvent('pointercancel');
    act(() => { r1.current.onPointerCancel(cancel as unknown as React.PointerEvent); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(onLongPress).not.toHaveBeenCalled();

    onLongPress.mockClear();

    // Test pointerLeave
    const { result: r2 } = renderHook(() => useLongPress({ onLongPress }));
    const down2 = makePointerEvent('pointerdown');
    act(() => { r2.current.onPointerDown(down2 as unknown as React.PointerEvent); });
    const leave = makePointerEvent('pointerleave');
    act(() => { r2.current.onPointerLeave(leave as unknown as React.PointerEvent); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('LP5: custom delayMs (800ms) — fires at 800ms, not at 799ms', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, delayMs: 800 }));

    const down = makePointerEvent('pointerdown');
    act(() => { result.current.onPointerDown(down as unknown as React.PointerEvent); });

    act(() => { vi.advanceTimersByTime(799); });
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('LP6: unmounting while timer pending produces no onLongPress call', () => {
    const onLongPress = vi.fn();
    const { result, unmount } = renderHook(() => useLongPress({ onLongPress }));

    const down = makePointerEvent('pointerdown');
    act(() => { result.current.onPointerDown(down as unknown as React.PointerEvent); });

    act(() => { unmount(); });
    act(() => { vi.advanceTimersByTime(600); });

    expect(onLongPress).not.toHaveBeenCalled();
  });
});
