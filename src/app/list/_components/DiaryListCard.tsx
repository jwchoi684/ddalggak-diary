import React from 'react';
import type { DiaryEntry } from '@/lib/storage';
import { Card } from '@/design-system/Card';
import { MoodIcon } from '@/design-system/MoodIcon';
import { formatListDate } from '@/lib/utils/formatListDate';
import { PhotoThumbnailStrip } from './PhotoThumbnailStrip';

export interface DiaryListCardProps {
  entry: DiaryEntry;
  onTap: () => void;
}

const DATE_FMT = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/**
 * Single diary list card: MoodIcon + formatted date + body text + photo strip.
 * Wrapped in a <button> for full tap area; Card provides the white surface.
 */
export function DiaryListCard({ entry, onTap }: DiaryListCardProps) {
  const ariaLabel = `${DATE_FMT.format(new Date(entry.date + 'T00:00:00'))} 일기 보기`;
  const hasText = entry.text.length > 0;
  const hasPhotos = entry.photos.length > 0;

  return (
    <button
      type="button"
      className="w-full text-left"
      aria-label={ariaLabel}
      onClick={onTap}
    >
      <Card className="p-4">
        <MoodIcon id={entry.mood} size={64} className="mx-auto" />
        <p className="text-meta text-sm text-center mt-2">
          {formatListDate(entry.date)}
        </p>

        {hasText && (
          <p className="text-charcoal line-clamp-3 mt-2">{entry.text}</p>
        )}
        {!hasText && !hasPhotos && (
          <p className="text-meta italic mt-2">(내용 없음)</p>
        )}

        {hasPhotos && <PhotoThumbnailStrip photos={entry.photos} />}
      </Card>
    </button>
  );
}
