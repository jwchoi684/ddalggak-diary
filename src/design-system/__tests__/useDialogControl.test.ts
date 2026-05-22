// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useDialogControl } from '@/design-system/useDialogControl';

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

// Minimal wrapper component that wires useDialogControl to a real <dialog>
function TestDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { ref, onDialogClick } = useDialogControl(open, onClose);
  return React.createElement('dialog', { ref, onClick: onDialogClick });
}

describe('useDialogControl', () => {
  it('open=true calls showModal once', () => {
    render(React.createElement(TestDialog, { open: true, onClose: vi.fn() }));
    expect(showModalMock).toHaveBeenCalledTimes(1);
  });

  it('open=false calls close once', () => {
    render(React.createElement(TestDialog, { open: false, onClose: vi.fn() }));
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('toggling true→false→true calls showModal twice', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      React.createElement(TestDialog, { open: true, onClose }),
    );
    act(() => {
      rerender(React.createElement(TestDialog, { open: false, onClose }));
    });
    act(() => {
      rerender(React.createElement(TestDialog, { open: true, onClose }));
    });
    expect(showModalMock).toHaveBeenCalledTimes(2);
  });

  it('onDialogClick with matching target calls onClose', () => {
    const onClose = vi.fn();
    render(React.createElement(TestDialog, { open: false, onClose }));
    const dialogEl = document.querySelector('dialog') as HTMLDialogElement;

    // Simulate click where target === dialog element (backdrop click)
    act(() => {
      dialogEl.dispatchEvent(
        new MouseEvent('click', { bubbles: true, target: dialogEl } as MouseEventInit),
      );
    });
    // fireEvent sets e.target to the element; since we click the dialog itself, target === dialog
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onDialogClick with non-matching target does NOT call onClose', () => {
    const onClose = vi.fn();
    render(React.createElement(TestDialog, { open: false, onClose }));
    const dialogEl = document.querySelector('dialog') as HTMLDialogElement;

    // Append a child and click it — target will be the child, not the dialog
    const childDiv = document.createElement('div');
    dialogEl.appendChild(childDiv);

    act(() => {
      childDiv.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    // The bubbled click's e.target is childDiv, not dialogEl
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancel event (Escape key) calls onClose', () => {
    const onClose = vi.fn();
    render(React.createElement(TestDialog, { open: true, onClose }));
    const dialogEl = document.querySelector('dialog') as HTMLDialogElement;

    act(() => {
      dialogEl.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancel event after open=false does not call onClose again', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      React.createElement(TestDialog, { open: true, onClose }),
    );
    act(() => {
      rerender(React.createElement(TestDialog, { open: false, onClose }));
    });
    const callCountAfterClose = onClose.mock.calls.length;

    const dialogEl = document.querySelector('dialog') as HTMLDialogElement;
    act(() => {
      dialogEl.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true }));
    });

    // Listener was removed — no new calls
    expect(onClose.mock.calls.length).toBe(callCountAfterClose);
  });
});
