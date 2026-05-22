"use client";

import { useState, useCallback } from 'react';
import type { Photo } from '@/lib/storage';

export function usePhotoViewer(photos: Photo[]): {
  viewerOpen: boolean;
  viewerInitialIndex: number;
  openViewer: (id: string) => void;
  closeViewer: () => void;
} {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const openViewer = useCallback(
    (id: string) => {
      const idx = photos.findIndex((p) => p.id === id);
      setViewerInitialIndex(idx >= 0 ? idx : 0);
      setViewerOpen(true);
    },
    [photos],
  );

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  return { viewerOpen, viewerInitialIndex, openViewer, closeViewer };
}
