// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { PhotoViewer } from '@/app/diary/[date]/_components/PhotoViewer';
import { makePhoto } from '@/lib/storage/__tests__/fixtures';

let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;
let origShowModal: typeof HTMLDialogElement.prototype.showModal;
let origClose: typeof HTMLDialogElement.prototype.close;

beforeEach(() => {
  origShowModal = HTMLDialogElement.prototype.showModal;
  origClose = HTMLDialogElement.prototype.close;
  showModalMock = vi.fn();
  closeMock = vi.fn();
  HTMLDialogElement.prototype.showModal = showModalMock;
  HTMLDialogElement.prototype.close = closeMock;
});

afterEach(() => {
  HTMLDialogElement.prototype.showModal = origShowModal;
  HTMLDialogElement.prototype.close = origClose;
  cleanup();
});

function swipe(el: Element, axis: 'x' | 'y', delta: number) {
  fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(el, {
    clientX: axis === 'x' ? Math.sign(delta) * 6 : 0,
    clientY: axis === 'y' ? Math.sign(delta) * 6 : 0,
    pointerId: 1,
  });
  fireEvent.pointerUp(el, {
    clientX: axis === 'x' ? delta : 0,
    clientY: axis === 'y' ? delta : 0,
    pointerId: 1,
  });
}

describe('PhotoViewer', () => {
  it('PVC1: open=false → showModal never called', () => {
    const photos = [makePhoto()];
    render(<PhotoViewer photos={photos} open={false} initialIndex={0} onClose={vi.fn()} />);
    expect(showModalMock).not.toHaveBeenCalled();
  });

  it('PVC2: open=true, initialIndex=1 → correct image src and counter', async () => {
    const photos = [makePhoto(), makePhoto(), makePhoto()];
    render(<PhotoViewer photos={photos} open={true} initialIndex={1} onClose={vi.fn()} />);
    await act(async () => {});

    const img = document.querySelector('[data-testid="photo-viewer-img"]') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe(photos[1].dataUrl);

    const counter = document.querySelector('[data-testid="photo-viewer-counter"]');
    expect(counter?.textContent).toBe('2 / 3');
  });

  it('PVC3: close button click calls onClose', async () => {
    const photos = [makePhoto()];
    const onClose = vi.fn();
    render(<PhotoViewer photos={photos} open={true} initialIndex={0} onClose={onClose} />);
    await act(async () => {});

    const closeBtn = document.querySelector('[data-testid="photo-viewer-close"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    expect(closeBtn.getAttribute('aria-label')).toBe('닫기');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('PVC4: left swipe advances to next photo', async () => {
    const photos = [makePhoto(), makePhoto(), makePhoto()];
    render(<PhotoViewer photos={photos} open={true} initialIndex={0} onClose={vi.fn()} />);
    await act(async () => {});

    const container = document.querySelector('[data-testid="photo-viewer-container"]')!;
    expect(container).not.toBeNull();

    act(() => { swipe(container, 'x', -60); });

    const img = document.querySelector('[data-testid="photo-viewer-img"]') as HTMLImageElement;
    expect(img.src).toBe(photos[1].dataUrl);
  });

  it('PVC5: right swipe at index 0 stays at 0', async () => {
    const photos = [makePhoto(), makePhoto()];
    render(<PhotoViewer photos={photos} open={true} initialIndex={0} onClose={vi.fn()} />);
    await act(async () => {});

    const container = document.querySelector('[data-testid="photo-viewer-container"]')!;
    act(() => { swipe(container, 'x', 60); });

    const img = document.querySelector('[data-testid="photo-viewer-img"]') as HTMLImageElement;
    expect(img.src).toBe(photos[0].dataUrl);
  });

  it('PVC6: swipe left then right returns to first photo', async () => {
    const photos = [makePhoto(), makePhoto(), makePhoto()];
    render(<PhotoViewer photos={photos} open={true} initialIndex={0} onClose={vi.fn()} />);
    await act(async () => {});

    const container = document.querySelector('[data-testid="photo-viewer-container"]')!;

    act(() => { swipe(container, 'x', -60); });
    let img = document.querySelector('[data-testid="photo-viewer-img"]') as HTMLImageElement;
    expect(img.src).toBe(photos[1].dataUrl);

    act(() => { swipe(container, 'x', 60); });
    img = document.querySelector('[data-testid="photo-viewer-img"]') as HTMLImageElement;
    expect(img.src).toBe(photos[0].dataUrl);
  });

  it('PVC7: vertical swipe calls onClose', async () => {
    const photos = [makePhoto()];
    const onClose = vi.fn();
    render(<PhotoViewer photos={photos} open={true} initialIndex={0} onClose={onClose} />);
    await act(async () => {});

    const container = document.querySelector('[data-testid="photo-viewer-container"]')!;
    act(() => { swipe(container, 'y', 60); });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
