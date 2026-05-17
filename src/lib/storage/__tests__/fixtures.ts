import type { DiaryEntry, SearchConversation } from '@/lib/storage';

/**
 * Factory for valid DiaryEntry test fixtures.
 * Generates a unique id and date per call; override any field with `overrides`.
 */
let diaryCounter = 0;
export function makeDiary(overrides?: Partial<DiaryEntry>): DiaryEntry {
  diaryCounter += 1;
  const base: DiaryEntry = {
    id: `diary-id-${diaryCounter}`,
    date: `2026-05-${String(diaryCounter).padStart(2, '0')}`,
    mood: 'joy',
    text: `Test diary entry ${diaryCounter}`,
    textAlign: 'left',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...base, ...overrides };
}

/**
 * Factory for valid SearchConversation test fixtures.
 * Generates a unique id per call; override any field with `overrides`.
 */
let convCounter = 0;
export function makeConversation(
  overrides?: Partial<SearchConversation>,
): SearchConversation {
  convCounter += 1;
  const base: SearchConversation = {
    id: `conv-id-${convCounter}`,
    personaId: 'friend',
    title: `대화 ${convCounter}`,
    messages: [],
    startedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    isClosed: false,
  };
  return { ...base, ...overrides };
}
