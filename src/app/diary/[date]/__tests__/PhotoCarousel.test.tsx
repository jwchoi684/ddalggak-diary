// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { PhotoCarousel } from '@/app/diary/[date]/_components/PhotoCarousel';
import { makePhoto } from '@/lib/storage/__tests__/fixtures';
import type { Photo } from '@/lib/storage';

beforeEach(() => {
  vi.useFakeTimers();
  // happy-dom does not implement navigator.vibrate — stub it
  Object.defineProperty(navigator, 'vibrate', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('PhotoCarousel', () => {
  it('PC1: returns null (no DOM nodes) when photos is empty', () => {
    render(<PhotoCarousel photos={[]} onDelete={vi.fn()} />);
    expect(document.querySelector('[data-testid="photo-carousel"]')).toBeNull();
  });

  it('PC2: renders N thumbnails with correct data-testid and alt text', () => {
    const photos: Photo[] = [makePhoto(), makePhoto(), makePhoto()];
    render(<PhotoCarousel photos={photos} onDelete={vi.fn()} />);
    const carousel = document.querySelector('[data-testid="photo-carousel"]');
    expect(carousel).not.toBeNull();
    for (const p of photos) {
      const thumb = document.querySelector(`[data-testid="photo-thumb-${p.id}"]`);
      expect(thumb).not.toBeNull();
      expect(thumb?.getAttribute('alt')).toBe('첨부 사진');
    }
  });

  it('PC3: 500ms pointerdown hold → delete overlay appears', async () => {
    const photo = makePhoto();
    render(<PhotoCarousel photos={[photo]} onDelete={vi.fn()} />);

    const thumb = document.querySelector(`[data-testid="photo-thumb-${photo.id}"]`)!;
    fireEvent.pointerDown(thumb, { clientX: 0, clientY: 0 });

    act(() => { vi.advanceTimersByTime(500); });

    const overlay = document.querySelector(`[data-testid="delete-overlay-${photo.id}"]`);
    expect(overlay).not.toBeNull();
  });

  it('PC4: tapping delete button calls onDelete with photo id and removes overlay', () => {
    const photo = makePhoto();
    const onDelete = vi.fn();
    render(<PhotoCarousel photos={[photo]} onDelete={onDelete} />);

    const thumb = document.querySelector(`[data-testid="photo-thumb-${photo.id}"]`)!;
    fireEvent.pointerDown(thumb, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(500); });

    const deleteBtn = document.querySelector('button[aria-label="사진 삭제"]') as HTMLButtonElement;
    expect(deleteBtn).not.toBeNull();
    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith(photo.id);
    expect(document.querySelector(`[data-testid="delete-overlay-${photo.id}"]`)).toBeNull();
  });

  it('PC5: pointerdown outside overlay dismisses it', () => {
    const photo = makePhoto();
    render(<PhotoCarousel photos={[photo]} onDelete={vi.fn()} />);

    const thumb = document.querySelector(`[data-testid="photo-thumb-${photo.id}"]`)!;
    fireEvent.pointerDown(thumb, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(500); });

    expect(document.querySelector(`[data-testid="delete-overlay-${photo.id}"]`)).not.toBeNull();

    // Tap outside (on document body)
    fireEvent.pointerDown(document.body);

    expect(document.querySelector(`[data-testid="delete-overlay-${photo.id}"]`)).toBeNull();
  });

  it('PC6: navigator.vibrate(50) called exactly once on long-press', () => {
    const photo = makePhoto();
    render(<PhotoCarousel photos={[photo]} onDelete={vi.fn()} />);

    const thumb = document.querySelector(`[data-testid="photo-thumb-${photo.id}"]`)!;
    fireEvent.pointerDown(thumb, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(500); });

    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
    expect(navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it('PC7: short tap (pointerdown + pointerup before 500ms) calls onThumbnailTap', () => {
    const photo = makePhoto();
    const onThumbnailTap = vi.fn();
    render(<PhotoCarousel photos={[photo]} onDelete={vi.fn()} onThumbnailTap={onThumbnailTap} />);

    const thumb = document.querySelector(`[data-testid="photo-thumb-${photo.id}"]`)!;
    fireEvent.pointerDown(thumb, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.pointerUp(thumb, { clientX: 0, clientY: 0 });

    expect(onThumbnailTap).toHaveBeenCalledWith(photo.id);
  });

  it('PC8: multi-photo — long-press B shows overlay B and closes overlay A; tap-outside closes B (B-1 regression)', async () => {
    const photoA = makePhoto();
    const photoB = makePhoto();
    render(<PhotoCarousel photos={[photoA, photoB]} onDelete={vi.fn()} />);

    // Long-press photo A → overlay A appears
    const thumbA = document.querySelector(`[data-testid="photo-thumb-${photoA.id}"]`)!;
    fireEvent.pointerDown(thumbA, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(500); });
    expect(document.querySelector(`[data-testid="delete-overlay-${photoA.id}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-testid="delete-overlay-${photoB.id}"]`)).toBeNull();

    // Long-press photo B → overlay B appears; overlay A gone (single activeId guarantee)
    const thumbB = document.querySelector(`[data-testid="photo-thumb-${photoB.id}"]`)!;
    fireEvent.pointerUp(thumbA); // end first press cleanly
    fireEvent.pointerDown(thumbB, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(500); });
    expect(document.querySelector(`[data-testid="delete-overlay-${photoB.id}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-testid="delete-overlay-${photoA.id}"]`)).toBeNull();

    // Tap outside photo B → overlay B closes
    fireEvent.pointerDown(document.body);
    expect(document.querySelector(`[data-testid="delete-overlay-${photoB.id}"]`)).toBeNull();
  });
});
