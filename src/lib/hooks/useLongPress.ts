import { useRef, useCallback, useEffect } from 'react';
import type React from 'react';

export interface LongPressOptions {
  onLongPress: () => void;
  delayMs?: number;  // default 500
  slopPx?: number;   // default 5
}

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
}

/** Returns pointer-event handlers to spread onto the target element. */
export function useLongPress({ onLongPress, delayMs = 500, slopPx = 5 }: LongPressOptions): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);

  const cancel = useCallback(() => {
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  useEffect(() => () => { cancel(); }, [cancel]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    timer.current = setTimeout(() => { timer.current = null; onLongPress(); }, delayMs);
  }, [onLongPress, delayMs]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (Math.abs(e.clientX - startX.current) > slopPx || Math.abs(e.clientY - startY.current) > slopPx) cancel();
  }, [cancel, slopPx]);

  const onPointerUp = useCallback(() => { cancel(); }, [cancel]);
  const onPointerCancel = useCallback(() => { cancel(); }, [cancel]);
  const onPointerLeave = useCallback(() => { cancel(); }, [cancel]);

  return { onPointerDown, onPointerUp, onPointerMove, onPointerCancel, onPointerLeave };
}
