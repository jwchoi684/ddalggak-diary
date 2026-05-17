"use client";

import { useState, useRef, useEffect } from 'react';

/**
 * useToast — manages open/message state and auto-dismiss timer for Toast.
 *
 * Usage:
 *   const { message, open, show, hide } = useToast();
 *   <Toast message={message} open={open} onClose={hide} />
 *
 * show(msg, durationMs?) — sets open=true, schedules hide after durationMs (default 1800).
 *   Clears any prior timer so re-calling before expiry resets the countdown.
 * hide() — sets open=false immediately; cancels pending timer.
 *
 * No global singleton — each call site gets isolated state.
 */
export interface ToastState {
  message: string;
  open: boolean;
  show: (message: string, durationMs?: number) => void;
  hide: () => void;
}

export function useToast(): ToastState {
  const [state, setState] = useState<{ message: string; open: boolean }>({
    message: '',
    open: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function hide() {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState((prev) => ({ ...prev, open: false }));
  }

  function show(message: string, durationMs = 1800) {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
    }
    setState({ message, open: true });
    timerRef.current = setTimeout(hide, durationMs);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { message: state.message, open: state.open, show, hide };
}
