// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MOODS } from '@/design-system/moods';
import { ACTIVITIES } from '@/design-system/activities';
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

// <dialog> in happy-dom is not in a11y tree without open attr; query directly
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
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  HTMLDialogElement.prototype.showModal = origShowModal;
  HTMLDialogElement.prototype.close = origClose;
  vi.useRealTimers();
  cleanup();
});

describe('MoodPickerSheet', () => {
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

  it('renders a button for each of the 10 moods by default (기분 sub-tab)', () => {
    render(<MoodPickerSheet {...defaultProps} />);
    MOODS.forEach((mood) => expect(btn(mood.label)).toBeTruthy());
  });

  it('tapping a mood calls onSelect then onClose; does not call onCancelInitial', () => {
    const onSelect = vi.fn(), onClose = vi.fn(), onCancelInitial = vi.fn();
    render(
      <MoodPickerSheet
        {...defaultProps} mode="initial"
        onSelect={onSelect} onClose={onClose} onCancelInitial={onCancelInitial}
      />,
    );
    fireEvent.click(btn('기쁨'));
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

  it('tapping 테마 (inactive top-level tab) shows the 곧 만나요! toast', () => {
    render(<MoodPickerSheet {...defaultProps} />);
    fireEvent.click(btn('테마'));
    expect(document.body.textContent).toContain('곧 만나요!');
  });

  it('joy button has ring-2 and ring-peach when selectedId="joy"', () => {
    render(<MoodPickerSheet {...defaultProps} selectedId="joy" />);
    expect(btn('기쁨').className).toContain('ring-2');
    expect(btn('기쁨').className).toContain('ring-peach');
    expect(btn('슬픔').className).not.toContain('ring-2');
  });

  it('MoodPickerSheet.tsx has "use client" directive', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/design-system/MoodPickerSheet.tsx'), 'utf8',
    );
    expect(src).toContain('"use client"');
  });

  // MPS-N: tap 일상 sub-tab → grid shows 8 ACTIVITIES items (not the 10 moods)
  it('MPS-N: tapping 일상 sub-tab shows activity grid with all 8 activities', () => {
    render(<MoodPickerSheet {...defaultProps} />);
    fireEvent.click(btn('일상'));
    // All 8 activity labels should now be present
    ACTIVITIES.forEach((activity) => expect(btn(activity.label)).toBeTruthy());
    // None of the mood labels should be in the grid (moods hidden)
    // (기쁨 is a mood label — it should not appear as a button aria-label in the grid)
    const allBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
    const moodBtns = allBtns.filter(
      (b) => MOODS.some((m) => b.getAttribute('aria-label') === m.label),
    );
    expect(moodBtns).toHaveLength(0);
  });

  // MPS-N+1: selecting an activity fires onSelect with the ActivityId
  it('MPS-N+1: selecting an activity from 일상 tab fires onSelect with ActivityId', () => {
    const onSelect = vi.fn(), onClose = vi.fn();
    render(
      <MoodPickerSheet {...defaultProps} onSelect={onSelect} onClose={onClose} />,
    );
    fireEvent.click(btn('일상'));
    fireEvent.click(btn('식사'));
    expect(onSelect).toHaveBeenCalledWith('meal');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
