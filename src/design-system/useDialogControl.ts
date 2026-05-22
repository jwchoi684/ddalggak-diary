"use client";

import React, { useRef, useEffect } from 'react';

/**
 * useDialogControl — shared hook for <dialog> open/close via showModal/close.
 *
 * Callers pass the returned ref to <dialog ref={ref}> and attach onDialogClick
 * to the dialog's onClick handler to detect backdrop clicks.
 *
 * open=true  → ref.current.showModal()  (inside useEffect, never at render)
 * open=false → ref.current.close()
 *
 * Backdrop click detection: e.target === ref.current means the click landed on
 * the <dialog> backdrop (not a child), so onClose is called.
 *
 * Escape key: native <dialog> fires a 'cancel' event before auto-closing.
 * We attach a listener that calls onClose() and calls e.preventDefault() so
 * the controlled `open` prop drives the close animation (not the browser).
 *
 * Caller is responsible for flipping open=false in their onClose handler.
 */
export interface DialogControlResult {
  ref: React.RefObject<HTMLDialogElement | null>;
  onDialogClick: (e: React.MouseEvent<HTMLDialogElement>) => void;
}

export function useDialogControl(
  open: boolean,
  onClose: () => void,
): DialogControlResult {
  const ref = useRef<HTMLDialogElement | null>(null);

  // Keep a ref to the latest onClose so the cancel listener never captures a stale copy.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open) {
      el.showModal();
      const handleCancel = (e: Event) => {
        e.preventDefault(); // keep controlled open prop in charge of animation
        onCloseRef.current();
      };
      el.addEventListener('cancel', handleCancel);
      return () => el.removeEventListener('cancel', handleCancel);
    } else {
      el.close();
    }
  }, [open]);

  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) {
      onClose();
    }
  }

  return { ref, onDialogClick };
}
