import { describe, it, expect } from 'vitest';
import { buildChatMessages } from '@/lib/ai/buildChatMessages';
import { PERSONA_MAP } from '@/design-system/personas';
import type { ChatMessage } from '@/lib/storage';

function makeMessage(
  overrides: Partial<ChatMessage> & { role: 'user' | 'assistant'; content: string },
): ChatMessage {
  return {
    id: 'msg-id',
    timestamp: '2026-05-01T10:00:00Z',
    ...overrides,
  };
}

describe('buildChatMessages — CONTEXT ISOLATION', () => {
  it('BCM1: ISOLATION — returned messages are exactly [system, ...sessionMessages] with NO extra messages', () => {
    const persona = PERSONA_MAP.friend;
    const sessionMessages: ChatMessage[] = [
      makeMessage({ id: 'u1', role: 'user', content: '안녕?' }),
      makeMessage({ id: 'a1', role: 'assistant', content: '안녕!' }),
      makeMessage({ id: 'u2', role: 'user', content: '오늘 기분이 어때?' }),
    ];

    const result = buildChatMessages({
      persona,
      diariesText: '일기 내용',
      sessionMessages,
    });

    // Exactly 1 system + 3 session messages = 4 total
    expect(result).toHaveLength(4);
    expect(result[0]?.role).toBe('system');
    expect(result[1]?.role).toBe('user');
    expect(result[1]?.content).toBe('안녕?');
    expect(result[2]?.role).toBe('assistant');
    expect(result[2]?.content).toBe('안녕!');
    expect(result[3]?.role).toBe('user');
    expect(result[3]?.content).toBe('오늘 기분이 어때?');
  });

  it('BCM2: system prompt includes persona systemPrompt and diary corpus', () => {
    const persona = PERSONA_MAP.therapist;
    const diariesText = '[2026-05-01] 기분: 기쁨(😊) | 본문: 좋은 하루';

    const result = buildChatMessages({
      persona,
      diariesText,
      sessionMessages: [],
    });

    expect(result).toHaveLength(1);
    const systemContent = result[0]?.content ?? '';
    expect(systemContent).toContain(persona.systemPrompt);
    expect(systemContent).toContain('[일기 목록]');
    expect(systemContent).toContain(diariesText);
  });

  it('BCM3: user/assistant messages interleave correctly and system is only first', () => {
    const persona = PERSONA_MAP.king;
    const sessionMessages: ChatMessage[] = [
      makeMessage({ id: 'm1', role: 'user', content: '첫 번째 질문' }),
      makeMessage({ id: 'm2', role: 'assistant', content: '첫 번째 답' }),
      makeMessage({ id: 'm3', role: 'user', content: '두 번째 질문' }),
      makeMessage({ id: 'm4', role: 'assistant', content: '두 번째 답' }),
    ];

    const result = buildChatMessages({
      persona,
      diariesText: '',
      sessionMessages,
    });

    // Verify no second system message
    const systemMessages = result.filter((m) => m.role === 'system');
    expect(systemMessages).toHaveLength(1);
    expect(result[0]?.role).toBe('system');

    // Verify interleaving
    expect(result[1]?.role).toBe('user');
    expect(result[2]?.role).toBe('assistant');
    expect(result[3]?.role).toBe('user');
    expect(result[4]?.role).toBe('assistant');
  });
});
