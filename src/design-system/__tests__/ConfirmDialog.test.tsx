// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConfirmDialog } from '@/design-system/ConfirmDialog';

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

describe('ConfirmDialog', () => {
  it('renders message text', () => {
    render(
      <ConfirmDialog
        open={true}
        message="정말 삭제할까요?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('정말 삭제할까요?')).toBeTruthy();
  });

  it('default Korean labels and buttons have min-h-[44px] class', () => {
    render(
      <ConfirmDialog
        open={true}
        message="확인하시겠습니까?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // <dialog> in happy-dom is not in a11y tree without `open` attr; query directly
    const buttons = document.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(labels).toContain('확인');
    expect(labels).toContain('취소');
    buttons.forEach((btn) => {
      expect(btn.className).toContain('min-h-[44px]');
    });
  });

  it('custom labels override defaults', () => {
    render(
      <ConfirmDialog
        open={true}
        message="삭제할까요?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        confirmLabel="삭제"
        cancelLabel="돌아가기"
      />,
    );
    const buttons = document.querySelectorAll('button');
    const labels = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(labels).toContain('삭제');
    expect(labels).toContain('돌아가기');
    expect(labels).not.toContain('확인');
    expect(labels).not.toContain('취소');
  });

  it('confirm click fires onConfirm only', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        message="확인?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '확인',
    ) as HTMLButtonElement;
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancel click fires onCancel only', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        message="확인?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '취소',
    ) as HTMLButtonElement;
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('backdrop click fires onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        message="확인?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    const dialogEl = document.querySelector('dialog') as HTMLElement;
    fireEvent.click(dialogEl, { target: dialogEl });
    expect(onCancel).toHaveBeenCalled();
  });

  it('destructive=true applies bg-danger to confirm button', () => {
    render(
      <ConfirmDialog
        open={true}
        message="삭제?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        destructive
      />,
    );
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '확인',
    ) as HTMLButtonElement;
    expect(confirmBtn.className).toContain('bg-danger');
    expect(confirmBtn.className).not.toContain('bg-charcoal');
  });

  it('source-guard: has "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/ConfirmDialog.tsx'),
      'utf8',
    );
    expect(src).toContain('"use client"');
  });
});
