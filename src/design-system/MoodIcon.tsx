// Pure server component — no use-client directive

import React from 'react';
import type { MoodId } from '@/lib/storage';
import { MOOD_MAP } from '@/design-system/moods';

/**
 * Props accepted by MoodIcon. Internal visual decisions (emoji, color, label)
 * are NOT exposed as props — they are derived from the id via MOOD_MAP.
 *
 * @property id        - A valid MoodId literal.
 * @property size      - Pixel dimensions for width, height, and font-size.
 * @property className - Optional Tailwind / CSS class for layout positioning.
 */
export interface MoodIconProps {
  id: MoodId;
  size: number;
  className?: string;
}

/**
 * Renders the mood emoji placeholder at a given pixel size.
 * This is a React Server Component — no use-client directive.
 *
 * Valid id: renders <span role="img" aria-label={mood.label}>{mood.emoji}</span>.
 * Unknown id at runtime: renders empty fallback span; never throws.
 *
 * Asset swap path: replace {mood.emoji} with <img>/<svg> — no caller changes needed.
 */
export function MoodIcon({ id, size, className }: MoodIconProps) {
  const mood = MOOD_MAP[id];

  if (!mood) {
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
      aria-label={mood.label}
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
      {mood.emoji}
    </span>
  );
}
