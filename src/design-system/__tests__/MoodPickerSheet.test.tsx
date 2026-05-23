// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MOODS } from '@/design-system/moods';
import { MoodPickerSheet } from '@/design-system/MoodPickerSheet';
import type { MoodPickerSheetProps } from '@/design-system/MoodPickerSheet';

let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;
let origShowModal: typeof HTMLDialogElement.prototype.showModal;
let origClose: typeof HTMLDialogElement.prototype.close;

const defaultProps: MoodPickerSheetProps = {
  open: true,
  date: '2026-05-17',
  mode: 'change',
  onSelect: vi.fn(),
  onClose: vi.fn(),
};

function btn(labelOrText: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.getAttribute('aria-label') === labelOrText || b.textContent?.trim() === labelOrText,
  );
  if (!found) throw new Error(`Button not found: ${labelOrText}`);
  return found;
}

beforeEach(() => {
  origShowModal = HTMLDialogElement.prototype.showModal;
  origClose = HTMLDialogElement.prototype.close;
  showModalMock = vi.fn();
  closeMock = vi.fn();
  HTMLDialogElement.prototype.showModal = showModalMock;
  HTMLDialogElement.prototype.close = closeMock;
  vi.clearAllMocks();
});

afterEach(() => {
  HTMLDialogElement.prototype.showModal = origShowModal;
  HTMLDialogElement.prototype.close = origClose;
  cleanup();
});

describe('MoodPickerSheet (illustrated 20-mood set, no tabs)', () => {
  it('open=true calls showModal', () => {
    render(<MoodPickerSheet {...defaultProps} open={true} />);
    expect(showModalMock).toHaveBeenCalledTimes(1);
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('open=false calls close', () => {
    render(<MoodPickerSheet {...defaultProps} open={false} />);
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(showModalMock).not.toHaveBeenCalled();
  });

  it('renders formatted date and title in header', () => {
    render(<MoodPickerSheet {...defaultProps} date="2026-05-17" />);
    expect(document.querySelector('p')?.textContent).toContain('2026.05.17 일');
    expect(document.querySelector('h2')?.textContent).toBe('오늘은 어떤 하루였나요?');
  });

  it('renders a button for every active mood (20 entries)', () => {
    render(<MoodPickerSheet {...defaultProps} />);
    MOODS.forEach((mood) => expect(btn(mood.label)).toBeTruthy());
  });

  it('mood grid uses a 4-column layout', () => {
    render(<MoodPickerSheet {...defaultProps} />);
    const grid = document.querySelector('.grid') as HTMLElement;
    expect(grid).toBeTruthy();
    expect(grid.className).toContain('grid-cols-4');
  });

  it('does not render the 테마 or 일상 tabs any more', () => {
    render(<MoodPickerSheet {...defaultProps} />);
    expect(() => btn('테마')).toThrow();
    expect(() => btn('일상')).toThrow();
    expect(() => btn('기분')).toThrow();
    expect(() => btn('기본')).toThrow();
  });

  it('tapping a mood calls onSelect then onClose; does not call onCancelInitial', () => {
    const onSelect = vi.fn(), onClose = vi.fn(), onCancelInitial = vi.fn();
    render(
      <MoodPickerSheet
        {...defaultProps} mode="initial"
        onSelect={onSelect} onClose={onClose} onCancelInitial={onCancelInitial}
      />,
    );
    fireEvent.click(btn('행복'));
    expect(onSelect).toHaveBeenCalledWith('joy');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancelInitial).not.toHaveBeenCalled();
    expect(onSelect.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  it('X button in change mode calls onClose once, not onCancelInitial', () => {
    const onClose = vi.fn(), onCancelInitial = vi.fn();
    render(
      <MoodPickerSheet {...defaultProps} mode="change" onClose={onClose} onCancelInitial={onCancelInitial} />,
    );
    fireEvent.click(btn('닫기'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancelInitial).not.toHaveBeenCalled();
  });

  it('X button in initial mode calls onCancelInitial then onClose', () => {
    const onClose = vi.fn(), onCancelInitial = vi.fn();
    render(
      <MoodPickerSheet {...defaultProps} mode="initial" onClose={onClose} onCancelInitial={onCancelInitial} />,
    );
    fireEvent.click(btn('닫기'));
    expect(onCancelInitial).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancelInitial.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  it('joy button has ring-2 and ring-peach when selectedId="joy"', () => {
    render(<MoodPickerSheet {...defaultProps} selectedId="joy" />);
    expect(btn('행복').className).toContain('ring-2');
    expect(btn('행복').className).toContain('ring-peach');
    expect(btn('슬픔').className).not.toContain('ring-2');
  });

  it('MoodPickerSheet.tsx has "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/MoodPickerSheet.tsx'),
      'utf8',
    );
    expect(src).toContain('"use client"');
  });
});
