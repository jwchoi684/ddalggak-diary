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

  useEffect(() => {
    if (open) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [open]);

  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) {
      onClose();
    }
  }

  return { ref, onDialogClick };
}
