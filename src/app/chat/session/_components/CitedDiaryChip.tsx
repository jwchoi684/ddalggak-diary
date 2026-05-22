"use client";

import React from 'react';

interface CitedDiaryChipProps {
  diaryId: string;
  /** Display label override. Defaults to 📌 + diaryId if omitted. */
  label?: string;
  onTap?: (diaryId: string) => void;
}

/**
 * CitedDiaryChip — tappable pill linking to a cited diary entry.
 *
 * Tap routes to /diary/{date} for the referenced entry.
 * The parent resolves diaryId → date before rendering.
 */
export function CitedDiaryChip({ diaryId, label, onTap }: CitedDiaryChipProps) {
  const displayLabel = label ?? `📌 ${diaryId}`;

  return (
    <button
      type="button"
      data-testid={`cited-diary-chip-${diaryId}`}
      aria-label={`인용된 일기: ${displayLabel}`}
      onClick={() => onTap?.(diaryId)}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-peach-light text-charcoal"
      style={{ minHeight: 28 }}
    >
      {displayLabel}
    </button>
  );
}
