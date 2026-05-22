// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useSwipe } from '@/lib/hooks/useSwipe';

afterEach(() => {
  cleanup();
});

function makePointerEvent(type: string, overrides: Partial<PointerEventInit> = {}): PointerEvent {
  return new PointerEvent(type, { bubbles: true, clientX: 0, clientY: 0, pointerId: 1, ...overrides });
}

describe('useSwipe', () => {
  it('SW1: dx < -50 fires onSwipeLeft', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeVertical = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical }));

    act(() => { result.current.onPointerDown(makePointerEvent('pointerdown', { clientX: 0, clientY: 0 }) as unknown as React.PointerEvent); });
    // lock x axis
    act(() => { result.current.onPointerMove(makePointerEvent('pointermove', { clientX: -6, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerUp(makePointerEvent('pointerup', { clientX: -51, clientY: 0 }) as unknown as React.PointerEvent); });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeVertical).not.toHaveBeenCalled();
  });

  it('SW2: dx > +50 fires onSwipeRight', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeVertical = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical }));

    act(() => { result.current.onPointerDown(makePointerEvent('pointerdown', { clientX: 0, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerMove(makePointerEvent('pointermove', { clientX: 6, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerUp(makePointerEvent('pointerup', { clientX: 51, clientY: 0 }) as unknown as React.PointerEvent); });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeVertical).not.toHaveBeenCalled();
  });

  it('SW3: dy > +50 fires onSwipeVertical', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeVertical = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical }));

    act(() => { result.current.onPointerDown(makePointerEvent('pointerdown', { clientX: 0, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerMove(makePointerEvent('pointermove', { clientX: 0, clientY: 6 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerUp(makePointerEvent('pointerup', { clientX: 0, clientY: 51 }) as unknown as React.PointerEvent); });

    expect(onSwipeVertical).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('SW4: dy < -50 fires onSwipeVertical', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeVertical = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical }));

    act(() => { result.current.onPointerDown(makePointerEvent('pointerdown', { clientX: 0, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerMove(makePointerEvent('pointermove', { clientX: 0, clientY: -6 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerUp(makePointerEvent('pointerup', { clientX: 0, clientY: -51 }) as unknown as React.PointerEvent); });

    expect(onSwipeVertical).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('SW5: sub-threshold |dx|=30 → no callback', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeVertical = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical }));

    act(() => { result.current.onPointerDown(makePointerEvent('pointerdown', { clientX: 0, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerMove(makePointerEvent('pointermove', { clientX: -6, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerUp(makePointerEvent('pointerup', { clientX: -30, clientY: 0 }) as unknown as React.PointerEvent); });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeVertical).not.toHaveBeenCalled();
  });

  it('SW6: axis-lock — x locks first; subsequent large y movement ignored', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeVertical = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical }));

    act(() => { result.current.onPointerDown(makePointerEvent('pointerdown', { clientX: 0, clientY: 0 }) as unknown as React.PointerEvent); });
    // x wins the axis race (adx=6 > ady=2)
    act(() => { result.current.onPointerMove(makePointerEvent('pointermove', { clientX: -6, clientY: 2 }) as unknown as React.PointerEvent); });
    // large y move — should be ignored because axis is already locked to x
    act(() => { result.current.onPointerMove(makePointerEvent('pointermove', { clientX: -6, clientY: 200 }) as unknown as React.PointerEvent); });
    // final dx=-60 → swipeLeft
    act(() => { result.current.onPointerUp(makePointerEvent('pointerup', { clientX: -60, clientY: 200 }) as unknown as React.PointerEvent); });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeVertical).not.toHaveBeenCalled();
  });

  it('SW7: pointercancel resets state; next gesture works normally', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeVertical = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical }));

    // First gesture — cancelled
    act(() => { result.current.onPointerDown(makePointerEvent('pointerdown', { clientX: 0, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerCancel(makePointerEvent('pointercancel') as unknown as React.PointerEvent); });
    expect(onSwipeLeft).not.toHaveBeenCalled();

    // Second gesture — fresh left swipe
    act(() => { result.current.onPointerDown(makePointerEvent('pointerdown', { clientX: 0, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerMove(makePointerEvent('pointermove', { clientX: -6, clientY: 0 }) as unknown as React.PointerEvent); });
    act(() => { result.current.onPointerUp(makePointerEvent('pointerup', { clientX: -60, clientY: 0 }) as unknown as React.PointerEvent); });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });
});
