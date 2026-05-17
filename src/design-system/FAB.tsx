"use client";

import React from 'react';

/**
 * FAB — Floating Action Button (56×56, charcoal, fixed bottom-right).
 *
 * @property icon      - Icon content (24×24 recommended; caller sizes).
 * @property label     - Korean aria-label (required, non-empty).
 * @property onClick   - Click handler.
 * @property className - Optional override classes (e.g., to change fixed positioning).
 *
 * Touch target (56×56) is enforced via inline style.
 * Default position: fixed bottom-6 right-6 (can be overridden via className).
 */
export interface FABProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

export function FAB({ icon, label, onClick, className = '' }: FABProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`bg-charcoal text-paper rounded-full fixed bottom-6 right-6 inline-flex items-center justify-center ${className}`}
      style={{ width: 56, height: 56 }}
    >
      {icon}
    </button>
  );
}
