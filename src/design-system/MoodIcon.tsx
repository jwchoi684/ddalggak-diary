"use client";

import React, { useState } from 'react';
import type { PickerId } from '@/lib/storage';
import { getPickerItem } from '@/design-system/picker';

export interface MoodIconProps {
  id: PickerId;
  size: number;
  className?: string;
}

/**
 * Renders the illustrated mood / activity icon. The illustrated PNGs live at
 * /public/moods/<id>.png; on load error (e.g. legacy 'grateful' with no asset)
 * we fall back to the emoji placeholder so nothing renders as a broken image.
 */
export function MoodIcon({ id, size, className }: MoodIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

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
        style={{ display: 'inline-flex', width: size, height: size }}
        className={className}
      />
    );
  }

  if (!imgFailed) {
    // Plain <img> chosen over next/image: assets are tiny PNGs served from
    // /public and the image needs sizes from 24px up to 96px without dynamic
    // domains. next/image's optimizer would add per-render overhead without a
    // bandwidth win at this scale.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/moods/${id}.png`}
        alt={item.label}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        className={className}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  // Fallback — emoji at the requested pixel size.
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
