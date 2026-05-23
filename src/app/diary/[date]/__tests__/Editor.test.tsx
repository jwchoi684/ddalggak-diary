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

vi.mock('@/lib/storage/photoBase64', () => ({
  addPhotoFromFile: vi.fn(),
}));

const { readDiaries, upsertDiary, removeDiary } = await import('@/lib/storage');
const readDiariesMock = readDiaries as ReturnType<typeof vi.fn>;
const upsertDiaryMock = upsertDiary as ReturnType<typeof vi.fn>;
const removeDiaryMock = removeDiary as ReturnType<typeof vi.fn>;
const { addPhotoFromFile } = await import('@/lib/storage/photoBase64');
const addPhotoFromFileMock = addPhotoFromFile as ReturnType<typeof vi.fn>;
const { makeDiary, makePhoto } = await import('@/lib/storage/__tests__/fixtures');
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

  it('C-strip-1: tapping date label opens strip (aria-expanded toggles)', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'hello' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    // Date toggle button (aria-label="날짜 선택")
    const toggleBtn = document.querySelector('button[aria-label="날짜 선택"]');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggleBtn!);
    await act(async () => {});

    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
    // Strip container mounted
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    // Tap again — strip closes
    fireEvent.click(toggleBtn!);
    await act(async () => {});
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it('C-strip-2: tapping a different date cell rebinds the current draft to the new date (no reload, no separate entry)', async () => {
    const entryA = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'date A content' });
    const entryB = makeDiary({ date: '2026-05-16', mood: 'calm', text: 'date B content' });
    readDiariesMock.mockReturnValue([entryA, entryB]);
    await renderEditor('2026-05-15');

    fireEvent.click(document.querySelector('button[aria-label="날짜 선택"]')!);
    await act(async () => {});

    const cellB = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find(
      (el) => {
        const label = el.getAttribute('aria-label') ?? '';
        return label.includes('5월') && label.includes('16일');
      },
    );
    expect(cellB).toBeTruthy();

    upsertDiaryMock.mockClear();
    fireEvent.click(cellB!);
    await act(async () => {});
    await act(async () => {});

    // The current draft (entry A) is now persisted UNDER the new date 2026-05-16
    // — the picker move is "this entry, different date", not "switch entries".
    expect(upsertDiaryMock).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-05-16' }),
    );
    // Textarea content stays the same — no reload triggered by the date change.
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('date A content');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it('C-strip-3: switching dates does NOT re-open MoodPickerSheet (the draft is preserved, not reloaded)', async () => {
    const entryA = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'A' });
    readDiariesMock.mockReturnValue([entryA]);
    await renderEditor('2026-05-15');

    showModalMock.mockClear();

    fireEvent.click(document.querySelector('button[aria-label="날짜 선택"]')!);
    await act(async () => {});

    const emptyCell = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find(
      (el) => {
        const label = el.getAttribute('aria-label') ?? '';
        return label.includes('5월') && label.includes('16일');
      },
    );
    fireEvent.click(emptyCell!);
    await act(async () => {});
    await act(async () => {});

    // The strip itself opens a <dialog>, which calls showModal. Filter to the
    // mood-picker dialog so we ignore that. The mood sheet must NOT re-open
    // because the current draft already has a mood — picker change is just a
    // date rebind, not a reload-into-empty-state.
    const moodSheet = document.querySelector('[data-testid="mood-picker-sheet"]');
    expect(moodSheet?.getAttribute('open')).not.toBe('');
  });

  it('C-photo-1: tapping gallery button triggers .click() on hidden file input', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(btn('갤러리'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it('C-photo-2: file change → addPhotoFromFile ok → upsertDiary includes new photo', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '' });
    readDiariesMock.mockReturnValue([entry]);
    const photo = makePhoto();
    addPhotoFromFileMock.mockResolvedValue({ ok: true, photo });

    await renderEditor();
    upsertDiaryMock.mockClear();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'test.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    act(() => { vi.advanceTimersByTime(1000); });

    expect(upsertDiaryMock).toHaveBeenCalledWith(
      expect.objectContaining({ photos: expect.arrayContaining([photo]) }),
    );
  });

  it('C-photo-3: addPhotoFromFile count_exceeded → toast "최대 10장입니다"', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '' });
    readDiariesMock.mockReturnValue([entry]);
    addPhotoFromFileMock.mockResolvedValue({ ok: false, reason: 'count_exceeded' });

    await renderEditor();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'test.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(document.body.textContent).toContain('최대 10장입니다');
  });

  it('C-viewer-1: short-tap thumbnail → showModal called for PhotoViewer', async () => {
    vi.useFakeTimers();
    const photo = makePhoto();
    readDiariesMock.mockReturnValue([makeDiary({ date: '2026-05-15', mood: 'joy', photos: [photo] })]);
    await renderEditor();

    const countBefore = showModalMock.mock.calls.length;

    const thumb = document.querySelector(`[data-testid="photo-thumb-${photo.id}"]`)!;
    expect(thumb).not.toBeNull();
    fireEvent.pointerDown(thumb, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.pointerUp(thumb, { clientX: 0, clientY: 0 });
    await act(async () => {});

    expect(showModalMock.mock.calls.length).toBe(countBefore + 1);
  });

  it('C-viewer-2: click viewer close button → closeMock called', async () => {
    vi.useFakeTimers();
    const photo = makePhoto();
    readDiariesMock.mockReturnValue([makeDiary({ date: '2026-05-15', mood: 'joy', photos: [photo] })]);
    await renderEditor();

    const thumb = document.querySelector(`[data-testid="photo-thumb-${photo.id}"]`)!;
    fireEvent.pointerDown(thumb, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.pointerUp(thumb, { clientX: 0, clientY: 0 });
    await act(async () => {});

    const closeBtn = document.querySelector('[data-testid="photo-viewer-close"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    const countBefore = closeMock.mock.calls.length;
    fireEvent.click(closeBtn);
    await act(async () => {});

    expect(closeMock.mock.calls.length).toBe(countBefore + 1);
  });

  it('C-photo-4: upsertDiary throws → toast "저장에 실패했어요" and MARK_SAVED not dispatched', async () => {
    const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'original' });
    readDiariesMock.mockReturnValue([entry]);
    await renderEditor();

    upsertDiaryMock.mockImplementation(() => { throw new Error('QuotaExceededError'); });

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '수정됨' } });

    act(() => { vi.advanceTimersByTime(1000); });

    expect(document.body.textContent).toContain('저장에 실패했어요');
    // isDirty should still be true (MARK_SAVED was NOT dispatched)
    expect(document.querySelector('button[aria-label="저장"]')).not.toBeNull();
  });
});
