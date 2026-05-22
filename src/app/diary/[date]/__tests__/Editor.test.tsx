// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import {
  mockRouter,
  mockUseRouter,
  mockUseSearchParams,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';

vi.mock('next/navigation', () => ({
  useRouter:       () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
  useParams:       () => mockUseParams(),
  usePathname:     () => mockUsePathname(),
}));

vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...original,
    readDiaries: vi.fn(() => []),
    upsertDiary: vi.fn(),
    removeDiary: vi.fn(),
  };
});

const { readDiaries, upsertDiary, removeDiary } = await import('@/lib/storage');
const readDiariesMock = readDiaries as ReturnType<typeof vi.fn>;
const upsertDiaryMock = upsertDiary as ReturnType<typeof vi.fn>;
const removeDiaryMock = removeDiary as ReturnType<typeof vi.fn>;
const { makeDiary } = await import('@/lib/storage/__tests__/fixtures');
const { Editor } = await import('@/app/diary/[date]/_components/Editor');

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
  vi.useFakeTimers();
  vi.clearAllMocks();
  resetNavigationMocks();
  readDiariesMock.mockReturnValue([]);
});

afterEach(() => {
  HTMLDialogElement.prototype.showModal = origShowModal;
  HTMLDialogElement.prototype.close = origClose;
  vi.useRealTimers();
  cleanup();
});

async function renderEditor(date = '2026-05-15') {
  render(<Editor date={date} />);
  await act(async () => {}); // flush useEffect (LOAD_ENTRY)
}

/** Finds a button by aria-label or text content */
function btn(labelOrText: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.getAttribute('aria-label') === labelOrText || b.textContent?.trim() === labelOrText,
  );
  if (!found) throw new Error(`Button not found: "${labelOrText}"`);
  return found;
}

describe('Editor', () => {
  it('C1: new entry — empty textarea, showModal called, delete button absent', async () => {
    readDiariesMock.mockReturnValue([]);
    await renderEditor();

    const textarea = document.querySelector('textarea');
    expect(textarea?.value).toBe('');
    // showModal called = mood sheet auto-opened
    expect(showModalMock).toHaveBeenCalled();
    // Delete item must not appear in any button
    const allText = Array.from(document.querySelectorAll('button'))
      .map((b) => b.textContent ?? '').join('');
    expect(allText).not.toContain('일기 삭제');
  });

  it('C2: existing entry — textarea filled, delete visible in more menu', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '행복한 하루' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('행복한 하루');

    // Open more menu
    fireEvent.click(btn('더보기'));
    // Delete item must be present
    expect(document.body.textContent).toContain('일기 삭제');
  });

  it('C3: 1-per-day — existing entry for date shown even if navigated as new', async () => {
    const entry = makeDiary({ date: '2026-05-20', mood: 'calm', text: '조용한 날' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor('2026-05-20');

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('조용한 날');
  });

  it('C4: autosave — typing + 1000ms → upsertDiary called, no toast', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '새 내용' } });

    act(() => { vi.advanceTimersByTime(1000); });

    expect(upsertDiaryMock).toHaveBeenCalledTimes(1);
    expect(upsertDiaryMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: '새 내용', date: '2026-05-15' }),
    );
    // No toast
    expect(document.body.textContent).not.toContain('일기를 저장했어요!');
  });

  it('C5: autosave guard — upsertDiary not called when mood is undefined', async () => {
    readDiariesMock.mockReturnValue([]); // new entry, mood=undefined
    await renderEditor();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '내용 있음' } });

    act(() => { vi.advanceTimersByTime(1000); });

    expect(upsertDiaryMock).not.toHaveBeenCalled();
  });

  it('C6: explicit save — ✓ tap → upsertDiary called + save toast shown', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'original' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '수정됨' } });
    fireEvent.focus(textarea);

    fireEvent.click(btn('저장'));

    expect(upsertDiaryMock).toHaveBeenCalledTimes(1);
    expect(upsertDiaryMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: '수정됨' }),
    );
    expect(document.body.textContent).toContain('일기를 저장했어요!');
  });

  it('C7: save icon absent when not dirty', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '변경 없음' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    // No changes — isDirty=false — ✓ icon (aria-label="저장") must not be in the DOM
    const saveBtn = document.querySelector('button[aria-label="저장"]');
    expect(saveBtn).toBeNull();
  });

  it('C8: dirty + back → unsaved dialog shown; router.back not called', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'original' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '수정됨' } });

    fireEvent.click(btn('뒤로가기'));

    expect(document.body.textContent).toContain('저장되지 않은 변경사항이 있어요');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('C9: "저장하고 나가기" → upsertDiary + router.back called', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'original' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '수정됨' } });

    fireEvent.click(btn('뒤로가기'));
    fireEvent.click(btn('저장하고 나가기'));

    expect(upsertDiaryMock).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(upsertDiaryMock.mock.invocationCallOrder[0]).toBeLessThan(
      mockRouter.back.mock.invocationCallOrder[0],
    );
  });

  it('C10: delete confirm → removeDiary(id) + router.back', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '삭제할 일기' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    fireEvent.click(btn('더보기'));
    fireEvent.click(btn('일기 삭제'));
    fireEvent.click(btn('삭제'));

    expect(removeDiaryMock).toHaveBeenCalledWith(entry.id);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('C11: mood icon tap → mood sheet opens with mode=change and selectedMoodId', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    showModalMock.mockClear();

    fireEvent.click(btn('기분 변경'));

    expect(showModalMock).toHaveBeenCalled();
    // MoodPickerSheet mood buttons use aria-label={mood.label} per MoodPickerSheet source
    const joyBtn = document.querySelector<HTMLButtonElement>('button[aria-label="기쁨"]');
    expect(joyBtn).toBeTruthy();
    expect(joyBtn?.className).toContain('ring-2');
  });

  it('C12: time icon inserts HH:MM at cursor', async () => {
    vi.setSystemTime(new Date('2026-05-15T14:30:00.000'));

    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'before' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.setSelectionRange(6, 6);

    fireEvent.click(btn('현재 시간 삽입'));

    expect(textarea.value).toBe('before14:30 ');
  });
});
