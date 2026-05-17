// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BottomSheet } from '@/design-system/BottomSheet';

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

describe('BottomSheet', () => {
  it('open=true invokes showModal', () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()}>
        <span>내용</span>
      </BottomSheet>,
    );
    expect(showModalMock).toHaveBeenCalledTimes(1);
  });

  it('open=false invokes close', () => {
    render(
      <BottomSheet open={false} onClose={vi.fn()}>
        <span>내용</span>
      </BottomSheet>,
    );
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('grip handle is always rendered regardless of open state', () => {
    const { rerender } = render(
      <BottomSheet open={false} onClose={vi.fn()}>
        <span>내용</span>
      </BottomSheet>,
    );
    const grip = document.querySelector('.w-10.h-1.rounded-full');
    expect(grip).toBeTruthy();

    rerender(
      <BottomSheet open={true} onClose={vi.fn()}>
        <span>내용</span>
      </BottomSheet>,
    );
    const grip2 = document.querySelector('.w-10.h-1.rounded-full');
    expect(grip2).toBeTruthy();
  });

  it('backdrop click fires onClose', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open={true} onClose={onClose}>
        <span>내용</span>
      </BottomSheet>,
    );
    const dialogEl = document.querySelector('dialog') as HTMLElement;
    // Simulate backdrop click where target is the dialog itself
    fireEvent.click(dialogEl, { target: dialogEl });
    // The onClick handler will compare e.target === ref.current
    // Since happy-dom sets target correctly on fireEvent.click, we check
    // that onClose was called (backdrop click detected)
    expect(onClose).toHaveBeenCalled();
  });

  it('children are rendered inside dialog', () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()}>
        <span data-testid="bs-child">내용</span>
      </BottomSheet>,
    );
    expect(screen.getByTestId('bs-child')).toBeTruthy();
  });

  it('source-guard: has "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/BottomSheet.tsx'),
      'utf8',
    );
    expect(src).toContain('"use client"');
  });
});
