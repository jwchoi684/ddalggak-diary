"use client";

import React from 'react';

/**
 * Toast — pill-shaped status notification (controlled).
 *
 * @property message    - Text to display inside the toast.
 * @property open       - When true, renders the toast; false → returns null.
 * @property onClose    - Called when the caller wants to dismiss (for ref).
 * @property role       - ARIA live role; default 'status'. Use 'alert' for urgent.
 * @property durationMs - Informational only; actual timer lives in useToast.
 * @property className  - Optional layout classes.
 *
 * This is a PURE CONTROLLED component. Auto-dismiss timer must be managed by
 * the caller (typically useToast hook).
 *
 * z-index note: <div> cannot exceed showModal() top layer. If a toast is needed
 * inside a modal dialog, render Toast as a child of the <dialog> DOM subtree.
 */
export interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  role?: 'status' | 'alert';
  durationMs?: number;
  className?: string;
}

export function Toast({
  message,
  open,
  role = 'status',
  className = '',
}: ToastProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      role={role}
      className={`bg-charcoal text-paper rounded-full fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 text-sm z-50 ${className}`}
    >
      {message}
    </div>
  );
}
