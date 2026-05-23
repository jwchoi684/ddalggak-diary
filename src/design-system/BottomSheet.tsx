"use client";

import React from 'react';
import { useDialogControl } from '@/design-system/useDialogControl';

/**
 * BottomSheet — slide-up modal anchored at the bottom of the screen.
 *
 * @property open      - Controlled open state. Toggle from caller.
 * @property onClose   - Called on backdrop click or native Escape key close.
 * @property children  - Sheet body content (below grip handle).
 * @property className - Optional layout classes on the inner content container.
 *
 * The <dialog> is ALWAYS mounted in the DOM — never conditionally rendered.
 * Removing it would break the slide-out animation. Visual open/close state
 * is driven by data-open attribute toggled below.
 *
 * showModal() provides native focus trap and Escape key close.
 * dialog::backdrop styling lives in globals.css.
 */
export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  className = '',
}: BottomSheetProps) {
  const { ref, onDialogClick } = useDialogControl(open, onClose);

  return (
    <dialog
      ref={ref}
      onClick={onDialogClick}
      data-open={open}
      // bg-cream so transparent PNGs (mood icons) don't show an anti-aliased
      // halo against a white surface. The rest of the app's content surface
      // is cream too, so the sheet sits flush with it visually.
      className="bg-cream p-6 w-full max-w-[var(--container-mobile)]"
      style={{
        borderRadius: '24px 24px 0 0',
        margin: 'auto auto 0 auto',
        translate: open ? 'none' : '0 100%',
        transition: 'translate 300ms ease',
      }}
    >
      {/* Grip handle */}
      <div className="bg-meta w-10 h-1 rounded-full mx-auto mb-4" />

      <div className={className}>{children}</div>
    </dialog>
  );
}
