"use client";

import React from 'react';
import { useDialogControl } from '@/design-system/useDialogControl';

/**
 * ConfirmDialog — native <dialog>-based confirmation modal.
 *
 * @property open          - Controlled open state. Caller flips it on confirm/cancel.
 * @property message       - Body text (aria-labelledby target).
 * @property onConfirm     - Fired on confirm button click. Caller must set open=false.
 * @property onCancel      - Fired on cancel button click or backdrop click.
 * @property confirmLabel  - Confirm button label; default '확인'.
 * @property cancelLabel   - Cancel button label; default '취소'.
 * @property destructive   - true → confirm button bg-danger; false → bg-charcoal.
 * @property className     - Optional layout classes on the dialog content container.
 *
 * Danger color fallback: bg-danger utility requires --color-danger in @theme.
 * If Tailwind 4 does not emit the utility, use style={{ backgroundColor: 'var(--color-danger)' }}.
 */
export interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  className?: string;
}

export function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
  className = '',
}: ConfirmDialogProps) {
  const { ref, onDialogClick } = useDialogControl(open, onCancel);

  const confirmClasses = destructive
    ? 'bg-danger text-paper'
    : 'bg-charcoal text-paper';

  return (
    <dialog
      ref={ref}
      onClick={onDialogClick}
      aria-labelledby="confirm-msg"
      className={`bg-paper rounded-[var(--radius-card-lg)] p-6 m-auto w-[calc(100%-2rem)] max-w-[340px] ${className}`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <p id="confirm-msg" className="text-charcoal text-base mb-6">
        {message}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] px-4 rounded-full text-sm font-medium border border-meta text-charcoal"
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className={`flex-1 min-h-[44px] px-4 rounded-full text-sm font-medium ${confirmClasses}`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
