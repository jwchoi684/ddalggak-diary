import React from 'react';
import type { Photo } from '@/lib/storage';

export interface PhotoThumbnailStripProps {
  photos: Photo[];
}

/**
 * Renders up to 3 photo thumbnails + an overflow "+N" badge when
 * photos.length > 3. Caller is responsible for only rendering this when
 * photos.length > 0.
 */
export function PhotoThumbnailStrip({ photos }: PhotoThumbnailStripProps) {
  const visible = photos.slice(0, 3);
  const overflow = photos.length - 3;

  return (
    <div className="flex flex-row gap-2 mt-3">
      {visible.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.id}
          src={photo.dataUrl}
          alt="첨부 사진"
          className="w-16 h-16 object-cover rounded-xl"
          loading="lazy"
        />
      ))}
      {overflow > 0 && (
        <div
          className="w-16 h-16 bg-[#EBEBEB] rounded-xl flex items-center justify-center text-charcoal text-sm font-medium"
          data-testid="photo-overflow-badge"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
