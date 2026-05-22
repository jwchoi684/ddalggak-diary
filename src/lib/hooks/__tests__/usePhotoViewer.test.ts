// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { usePhotoViewer } from '@/lib/hooks/usePhotoViewer';
import { makePhoto } from '@/lib/storage/__tests__/fixtures';

afterEach(() => {
  cleanup();
});

describe('usePhotoViewer', () => {
  it('PV1: initial state is closed at index 0', () => {
    const photos = [makePhoto()];
    const { result } = renderHook(() => usePhotoViewer(photos));
    expect(result.current.viewerOpen).toBe(false);
    expect(result.current.viewerInitialIndex).toBe(0);
  });

  it('PV2: openViewer(id) finds correct index', () => {
    const photos = [makePhoto(), makePhoto(), makePhoto()];
    const { result } = renderHook(() => usePhotoViewer(photos));

    act(() => { result.current.openViewer(photos[1].id); });

    expect(result.current.viewerOpen).toBe(true);
    expect(result.current.viewerInitialIndex).toBe(1);
  });

  it('PV3: openViewer(unknownId) falls back to 0', () => {
    const photos = [makePhoto(), makePhoto()];
    const { result } = renderHook(() => usePhotoViewer(photos));

    act(() => { result.current.openViewer('no-such-id'); });

    expect(result.current.viewerOpen).toBe(true);
    expect(result.current.viewerInitialIndex).toBe(0);
  });

  it('PV4: closeViewer() flips viewerOpen to false', () => {
    const photos = [makePhoto()];
    const { result } = renderHook(() => usePhotoViewer(photos));

    act(() => { result.current.openViewer(photos[0].id); });
    expect(result.current.viewerOpen).toBe(true);

    act(() => { result.current.closeViewer(); });
    expect(result.current.viewerOpen).toBe(false);
  });
});
