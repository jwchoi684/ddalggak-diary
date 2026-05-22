"use client";

import { useRef, useCallback } from 'react';
import type React from 'react';

export interface SwipeOptions {
  onSwipeLeft: () => void;     // dx < -threshold and axis locked to x
  onSwipeRight: () => void;    // dx > +threshold and axis locked to x
  onSwipeVertical: () => void; // |dy| > threshold and axis locked to y
  threshold?: number;          // default 50 (px displacement)
  slopPx?: number;             // default 5 (px before axis is locked)
}

export interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

/** Returns pointer-event handlers to spread onto the swipe target element. */
export function useSwipe(options: SwipeOptions): SwipeHandlers {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const startX = useRef(0);
  const startY = useRef(0);
  const lockedAxis = useRef<'x' | 'y' | null>(null);
  const active = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    lockedAxis.current = null;
    active.current = true;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // happy-dom may throw; safe to ignore
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return;
    if (lockedAxis.current !== null) return;

    const { slopPx = 5 } = optionsRef.current;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx > slopPx || ady > slopPx) {
      lockedAxis.current = adx >= ady ? 'x' : 'y';
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!active.current) return;
    active.current = false;

    const { threshold = 50, onSwipeLeft, onSwipeRight, onSwipeVertical } = optionsRef.current;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (lockedAxis.current === 'x') {
      if (dx < -threshold) onSwipeLeft();
      else if (dx > threshold) onSwipeRight();
    } else if (lockedAxis.current === 'y') {
      if (Math.abs(dy) > threshold) onSwipeVertical();
    }

    lockedAxis.current = null;
  }, []);

  const onPointerCancel = useCallback(() => {
    active.current = false;
    lockedAxis.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
