"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Photo } from '@/lib/storage';
import { useLongPress } from '@/lib/hooks/useLongPress';

export interface PhotoCarouselProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  /** Reserved for REQ-012. Default: () => {} */
  onThumbnailTap?: (id: string) => void;
}

const THUMB = 88;
const RADIUS = 12;

function Thumb({ photo, isActive, onActivate, onShortTap, onDelete }: {
  photo: Photo;
  isActive: boolean;
  onActivate: (id: string) => void;
  onShortTap: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // Per-instance ref: each Thumb owns its own overlay node reference (B-1 fix).
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const didLong = useRef(false);
  // NB-4: track move-slop cancellation so short-tap is suppressed after scroll/move.
  const didCancel = useRef(false);

  // B-1 fix: tap-outside listener lives inside Thumb, conditioned on isActive.
  useEffect(() => {
    if (!isActive) return;
    function onDoc(e: PointerEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onActivate('');  // signal parent to clear activeId for this photo
      }
    }
    document.addEventListener('pointerdown', onDoc);
    return () => { document.removeEventListener('pointerdown', onDoc); };
  }, [isActive, onActivate]);

  const lp = useLongPress({
    onLongPress: useCallback(() => {
      didLong.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      onActivate(photo.id);
    }, [onActivate, photo.id]),
  });

  return (
    <div role="listitem" style={{ position: 'relative', flexShrink: 0, scrollSnapAlign: 'start', width: THUMB, height: THUMB }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URLs are not compatible with next/image */}
      <img data-testid={`photo-thumb-${photo.id}`} src={photo.dataUrl} alt="첨부 사진" draggable={false}
        style={{ width: THUMB, height: THUMB, borderRadius: RADIUS, objectFit: 'cover', display: 'block' }}
        {...lp}
        onPointerMove={(e) => { lp.onPointerMove(e); didCancel.current = true; }}
        onPointerUp={(e) => {
          lp.onPointerUp(e);
          if (!didLong.current && !didCancel.current) onShortTap(photo.id);
          didLong.current = false;
          didCancel.current = false;
        }}
        onPointerDown={(e) => { didCancel.current = false; lp.onPointerDown(e); }}
      />
      {isActive && (
        <div ref={overlayRef} data-testid={`delete-overlay-${photo.id}`}
          style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button type="button" aria-label="사진 삭제" onClick={() => onDelete(photo.id)}
            className="text-white text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center">
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export function PhotoCarousel({ photos, onDelete, onThumbnailTap }: PhotoCarouselProps): React.ReactElement | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  // activate('') is used by Thumb's tap-outside handler to clear its own active state.
  const activate = useCallback((id: string) => setActiveId(id === '' ? null : id), []);
  const shortTap = useCallback((id: string) => { if (onThumbnailTap) onThumbnailTap(id); }, [onThumbnailTap]);
  const doDelete = useCallback((id: string) => { setActiveId(null); onDelete(id); }, [onDelete]);

  if (photos.length === 0) return null;
  return (
    <div data-testid="photo-carousel" role="list" className="no-scrollbar bg-cream"
      style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', gap: 8, padding: 4 }}>
      {photos.map((p) => (
        <Thumb key={p.id} photo={p} isActive={activeId === p.id}
          onActivate={activate} onShortTap={shortTap} onDelete={doDelete} />
      ))}
    </div>
  );
}
