"use client";

import React from 'react';

/**
 * IconButton — white circular header button (44×44 touch target).
 *
 * @property icon      - Icon content (24×24 recommended; caller sizes).
 * @property label     - Korean aria-label (required, non-empty).
 * @property onClick   - Click handler; NOT fired when disabled.
 * @property disabled  - Visual opacity-40 + cursor-not-allowed; blocks onClick.
 * @property className - Optional layout classes (margin, position).
 *
 * Touch target (44×44) is enforced via inline style and is NOT overridable
 * by className per the API contract.
 */
export interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  className = '',
}: IconButtonProps) {
  const disabledClasses = disabled ? 'opacity-40 cursor-not-allowed' : '';

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`bg-paper rounded-full inline-flex items-center justify-center ${disabledClasses} ${className}`}
      style={{ width: 44, height: 44 }}
    >
      {icon}
    </button>
  );
}
