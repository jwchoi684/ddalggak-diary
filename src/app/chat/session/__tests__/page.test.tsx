// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import {
  mockRouter,
  mockUseRouter,
  mockUseSearchParams,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';

// ─── Navigation mock ────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useSearchParams: () => mockSearchParamsInstance,
  useParams: () => mockUseParams(),
  usePathname: () => mockUsePathname(),
}));

// ─── Storage mock ───────────────────────────────────────────────────────────
vi.mock('@/lib/storage/useDiaries', () => ({
  useDiaries: () => ({ entries: mockDiaryEntries, isReady: true }),
}));

vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...original,
    upsertConversation: vi.fn(),
    generateId: vi.fn(() => `test-id-${idCounter++}`),
  };
});

// ─── AI module mock ─────────────────────────────────────────────────────────
vi.mock('@/lib/ai/callChat', () => ({
  callChat: vi.fn(),
}));

// ─── Mutable test state ─────────────────────────────────────────────────────
let mockSearchParamsInstance = new URLSearchParams('personaId=friend');
let mockDiaryEntries: Array<{ id: string; date: string; mood: 'joy'; text: string; textAlign: 'left'; photos: []; createdAt: string; updatedAt: string }> = [];
let idCounter = 0;

const { upsertConversation } = await import('@/lib/storage');
const upsertConversationMock = upsertConversation as ReturnType<typeof vi.fn>;
const { callChat } = await import('@/lib/ai/callChat');
const callChatMock = callChat as ReturnType<typeof vi.fn>;

// ─── Component under test (imported after mocks) ─────────────────────────
const { default: ActiveChatPage } = await import('../page');

function makeDiaryEntry(overrides?: Partial<{ id: string; date: string; text: string }>) {
  return {
    id: overrides?.id ?? 'diary-id-1',
    date: overrides?.date ?? '2026-05-01',
    mood: 'joy' as const,
    text: overrides?.text ?? '오늘은 좋은 날이었다',
    textAlign: 'left' as const,
    photos: [] as [],
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
  };
}

beforeEach(() => {
  cleanup();
  resetNavigationMocks();
  vi.clearAllMocks();
  idCounter = 0;
  mockSearchParamsInstance = new URLSearchParams('personaId=friend');
  mockDiaryEntries = [makeDiaryEntry()];
  // callChat now streams: fire onChunk with the full content, then resolve.
  callChatMock.mockImplementation(({ onChunk }: { onChunk?: (c: string) => void }) => {
    onChunk?.('AI 응답이에요!');
    return Promise.resolve({ content: 'AI 응답이에요!' });
  });
});

afterEach(() => {
  cleanup();
});

describe('ActiveChatPage (REQ-017)', () => {
  it('AC1: renders header with back button, persona label, and done button', () => {
    render(<ActiveChatPage />);

    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '대화 완료' })).toBeTruthy();
    // Persona button in header shows the current label (PersonaChangeSheet, closed in
    // the DOM, also contains "친구" so a plain getByText would match twice).
    expect(screen.getByTestId('chat-persona-button').textContent).toContain('친구');
  });

  it('AC2: sends user message and shows loading bubble, then AI response', async () => {
    render(<ActiveChatPage />);

    const textarea = screen.getByRole('textbox', { name: '메시지 입력' });
    fireEvent.change(textarea, { target: { value: '안녕하세요?' } });

    const sendBtn = screen.getByRole('button', { name: '전송' });
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    // After response, user message and AI response should appear
    expect(screen.getByText('안녕하세요?')).toBeTruthy();
    expect(screen.getByText('AI 응답이에요!')).toBeTruthy();
  });

  it('AC3: shows error bubble on API failure and allows retry', async () => {
    callChatMock
      .mockRejectedValueOnce(new Error('네트워크 오류'))
      .mockImplementationOnce(({ onChunk }: { onChunk?: (c: string) => void }) => {
        onChunk?.('재시도 성공!');
        return Promise.resolve({ content: '재시도 성공!' });
      });

    render(<ActiveChatPage />);

    const textarea = screen.getByRole('textbox', { name: '메시지 입력' });
    fireEvent.change(textarea, { target: { value: '질문입니다' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '전송' }));
    });

    // Error bubble should appear
    expect(screen.getByTestId('error-bubble')).toBeTruthy();
    expect(screen.getByText('응답을 받지 못했어요.')).toBeTruthy();

    // Retry
    await act(async () => {
      fireEvent.click(screen.getByText('다시 시도'));
    });

    expect(screen.getByText('재시도 성공!')).toBeTruthy();
  });

  it('AC4: shows empty diary state when no diary entries exist', () => {
    mockDiaryEntries = [];
    render(<ActiveChatPage />);

    expect(screen.getByText(/아직 일기가 없어요/)).toBeTruthy();
    expect(screen.getByTestId('go-to-calendar-btn')).toBeTruthy();
  });

  it('AC5: "완료" button persists conversation when messages exist and navigates to /chat', async () => {
    render(<ActiveChatPage />);

    const textarea = screen.getByRole('textbox', { name: '메시지 입력' });
    fireEvent.change(textarea, { target: { value: '저장될 메시지' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '전송' }));
    });

    // Click "완료"
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '대화 완료' }));
    });

    expect(upsertConversationMock).toHaveBeenCalledOnce();
    const savedConv = upsertConversationMock.mock.calls[0][0];
    expect(savedConv.isClosed).toBe(true);
    expect(savedConv.personaId).toBe('friend');
    expect(savedConv.messages.length).toBeGreaterThan(0);
    expect(mockRouter.push).toHaveBeenCalledWith('/chat');
  });

  it('AC6: empty conversation (0 messages) does NOT call upsertConversation on session end', async () => {
    render(<ActiveChatPage />);

    // Click "완료" without sending any message
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '대화 완료' }));
    });

    expect(upsertConversationMock).not.toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/chat');
  });

  it('AC7: tapping header persona button opens picker; selecting a new persona swaps the header label and persists with the new id', async () => {
    render(<ActiveChatPage />);

    // Open the persona-change sheet from the header.
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-persona-button'));
    });

    // Pick "연인" from the sheet grid.
    await act(async () => {
      fireEvent.click(screen.getByTestId('persona-change-card-lover'));
    });

    // Header now reflects the new persona.
    expect(screen.getByTestId('chat-persona-button').textContent).toContain('연인');

    // Send a message under the new persona so the conversation persists on session end.
    fireEvent.change(screen.getByRole('textbox', { name: '메시지 입력' }), {
      target: { value: '톤 바꿔서 보내는 메시지' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '전송' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '대화 완료' }));
    });

    expect(upsertConversationMock).toHaveBeenCalledOnce();
    const savedConv = upsertConversationMock.mock.calls[0][0];
    expect(savedConv.personaId).toBe('lover');
  });
});
