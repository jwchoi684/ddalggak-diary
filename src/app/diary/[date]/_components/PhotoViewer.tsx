"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useDialogControl } from '@/design-system/useDialogControl';
import { useSwipe } from '@/lib/hooks/useSwipe';
import type { Photo } from '@/lib/storage';

export interface PhotoViewerProps {
  photos: Photo[];
  open: boolean;
  initialIndex: number;
  onClose: () => void;
}

export function PhotoViewer({ photos, open, initialIndex, onClose }: PhotoViewerProps): React.ReactElement {
  const { ref } = useDialogControl(open, onClose);
  // intentionally omitting onDialogClick — backdrop swipe must not close viewer

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, photos.length - 1)));
    }
  }, [open, initialIndex, photos.length]);

  const onSwipeLeft = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, photos.length - 1));
  }, [photos.length]);

  const onSwipeRight = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const onSwipeVertical = useCallback(() => {
    onClose();
  }, [onClose]);

  const swipeHandlers = useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical });

  if (photos.length === 0) {
    return (
      <dialog
        ref={ref}
        className="p-0 m-0 border-none bg-transparent max-w-none max-h-none w-full h-full"
      />
    );
  }

  const photo = photos[currentIndex];

  return (
    <dialog
      ref={ref}
      className="p-0 m-0 border-none bg-transparent max-w-none max-h-none w-full h-full"
    >
      {open && (
        <div
          data-testid="photo-viewer-container"
          className="relative w-full h-[100dvh] bg-black flex flex-col"
          {...swipeHandlers}
        >
          <button
            data-testid="photo-viewer-close"
            aria-label="닫기"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 z-10 w-[44px] h-[44px] flex items-center justify-center text-white"
            type="button"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <span
            data-testid="photo-viewer-counter"
            aria-live="polite"
            className="absolute top-4 right-4 z-10 text-sm text-white"
          >
            {currentIndex + 1} / {photos.length}
          </span>

          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URLs are not compatible with next/image */}
          <img
            data-testid="photo-viewer-img"
            src={photo.dataUrl}
            alt={`사진 ${currentIndex + 1}`}
            className="flex-1 w-full object-contain"
          />
        </div>
      )}
    </dialog>
  );
}
