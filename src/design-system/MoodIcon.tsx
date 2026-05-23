// Pure server component — no use-client directive

import React from 'react';
import type { PickerId } from '@/lib/storage';
import { getPickerItem } from '@/design-system/picker';

/**
 * Props accepted by MoodIcon. Internal visual decisions (emoji, color, label)
 * are NOT exposed as props — they are derived from the id via getPickerItem.
 *
 * @property id        - A valid PickerId literal (MoodId or ActivityId).
 * @property size      - Pixel dimensions for width, height, and font-size.
 * @property className - Optional Tailwind / CSS class for layout positioning.
 */
export interface MoodIconProps {
  id: PickerId;
  size: number;
  className?: string;
}

/**
 * Renders the mood or activity emoji placeholder at a given pixel size.
 * This is a React Server Component — no use-client directive.
 *
 * Valid id: renders <span role="img" aria-label={item.label}>{item.emoji}</span>.
 * Unknown id at runtime: renders empty fallback span; never throws.
 *
 * Asset swap path: replace {item.emoji} with <img>/<svg> — no caller changes needed.
 */
export function MoodIcon({ id, size, className }: MoodIconProps) {
  let item: { emoji: string; label: string } | undefined;
  try {
    item = getPickerItem(id);
  } catch {
    item = undefined;
  }

  if (!item) {
    return (
      <span
        role="img"
        aria-label="알 수 없는 기분"
        data-testid="mood-icon-fallback"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
        }}
        className={className}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={item.label}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size,
        width: size,
        height: size,
        lineHeight: 1,
      }}
    >
      {item.emoji}
    </span>
  );
}
