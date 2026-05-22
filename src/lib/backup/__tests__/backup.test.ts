import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBackup,
  validateBackup,
  applyBackup,
} from '@/lib/backup/backup';
import {
  writeAllDiaries,
  writeAllConversations,
  writeAllSettings,
  readDiaries,
  readConversations,
  readSettings,
} from '@/lib/storage';
import type { DiaryEntry, SearchConversation } from '@/lib/storage';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeDiary(overrides?: Partial<DiaryEntry>): DiaryEntry {
  return {
    id: `diary-${Math.random().toString(36).slice(2)}`,
    date: '2026-05-01',
    mood: 'joy',
    text: 'test',
    textAlign: 'left',
    photos: [],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeConversation(overrides?: Partial<SearchConversation>): SearchConversation {
  return {
    id: `conv-${Math.random().toString(36).slice(2)}`,
    personaId: 'friend',
    title: '대화',
    messages: [],
    startedAt: '2026-05-01T00:00:00.000Z',
    lastMessageAt: '2026-05-01T00:00:00.000Z',
    isClosed: false,
    ...overrides,
  };
}

function makeValidBackupJson(overrides?: Partial<{
  version: unknown;
  diaries: unknown;
  conversations: unknown;
  settings: unknown;
}>): string {
  return JSON.stringify({
    version: 1,
    diaries: [],
    conversations: [],
    settings: {},
    ...overrides,
  });
}

// ─── BU1: buildBackup returns version 1 with arrays ──────────────────────────

describe('BU1: buildBackup', () => {
  it('returns version 1 with diaries, conversations, and settings', () => {
    const d = makeDiary({ date: '2026-05-10' });
    const c = makeConversation();
    writeAllDiaries([d]);
    writeAllConversations([c]);
    writeAllSettings({ theme: 'light' });

    const backup = buildBackup();

    expect(backup.version).toBe(1);
    expect(Array.isArray(backup.diaries)).toBe(true);
    expect(Array.isArray(backup.conversations)).toBe(true);
    expect(backup.diaries).toHaveLength(1);
    expect(backup.conversations).toHaveLength(1);
    expect(backup.settings).toEqual({ theme: 'light' });
  });

  it('returns empty arrays and empty settings when storage is empty', () => {
    const backup = buildBackup();

    expect(backup.version).toBe(1);
    expect(backup.diaries).toEqual([]);
    expect(backup.conversations).toEqual([]);
    expect(backup.settings).toEqual({});
  });
});

// ─── BU2: validateBackup accepts valid backup ─────────────────────────────────

describe('BU2: validateBackup — valid input', () => {
  it('accepts a well-formed BackupV1 JSON string', () => {
    const d = makeDiary({ date: '2026-05-15' });
    const c = makeConversation();
    const json = makeValidBackupJson({
      diaries: [d],
      conversations: [c],
      settings: { foo: 'bar' },
    });

    const result = validateBackup(json);

    expect(result.ok).toBe(true);
    if (!result.ok) return; // type narrowing
    expect(result.backup.version).toBe(1);
    expect(result.backup.diaries).toHaveLength(1);
    expect(result.backup.conversations).toHaveLength(1);
    expect(result.backup.settings).toEqual({ foo: 'bar' });
  });

  it('accepts backup with missing settings key — defaults to {}', () => {
    const json = JSON.stringify({ version: 1, diaries: [], conversations: [] });
    const result = validateBackup(json);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.settings).toEqual({});
  });
});

// ─── BU3: validateBackup rejects invalid JSON ────────────────────────────────

describe('BU3: validateBackup — invalid JSON', () => {
  it('returns ok: false for non-JSON text', () => {
    const result = validateBackup('not json at all {{{');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('returns ok: false for empty string', () => {
    const result = validateBackup('');

    expect(result.ok).toBe(false);
  });
});

// ─── BU4: validateBackup rejects wrong version ───────────────────────────────

describe('BU4: validateBackup — wrong version', () => {
  it('returns ok: false when version is 2', () => {
    const json = makeValidBackupJson({ version: 2 });
    const result = validateBackup(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('2');
  });

  it('returns ok: false when version field is missing (undefined)', () => {
    const json = JSON.stringify({ diaries: [], conversations: [] });
    const result = validateBackup(json);

    expect(result.ok).toBe(false);
  });

  it('returns ok: false when diaries is not an array', () => {
    const json = makeValidBackupJson({ diaries: 'not-an-array' });
    const result = validateBackup(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('diaries');
  });

  it('returns ok: false when conversations is not an array', () => {
    const json = makeValidBackupJson({ conversations: null });
    const result = validateBackup(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('conversations');
  });
});

// ─── BU5: applyBackup overwrite mode replaces all ────────────────────────────

describe('BU5: applyBackup — overwrite mode', () => {
  it('overwrites all three stores with backup contents', () => {
    // Seed existing data
    const existingDiary = makeDiary({ date: '2026-04-01', text: 'existing' });
    const existingConv = makeConversation({ title: '기존 대화' });
    writeAllDiaries([existingDiary]);
    writeAllConversations([existingConv]);
    writeAllSettings({ theme: 'dark' });

    // New backup with different data
    const newDiary = makeDiary({ date: '2026-05-20', text: 'new' });
    const newConv = makeConversation({ title: '새 대화' });
    const backup = {
      version: 1 as const,
      diaries: [newDiary],
      conversations: [newConv],
      settings: { lang: 'ko' },
    };

    applyBackup(backup, 'overwrite');

    const diaries = readDiaries();
    const convs = readConversations();
    const settings = readSettings();

    expect(diaries).toHaveLength(1);
    expect(diaries[0]?.text).toBe('new');
    expect(convs).toHaveLength(1);
    expect(convs[0]?.title).toBe('새 대화');
    expect(settings).toEqual({ lang: 'ko' });
  });

  it('clears stores when backup arrays are empty', () => {
    writeAllDiaries([makeDiary({ date: '2026-05-01' })]);
    writeAllConversations([makeConversation()]);

    applyBackup({ version: 1, diaries: [], conversations: [], settings: {} }, 'overwrite');

    expect(readDiaries()).toEqual([]);
    expect(readConversations()).toEqual([]);
  });
});

// ─── BU6: applyBackup merge mode keeps existing on conflict ──────────────────

describe('BU6: applyBackup — merge mode', () => {
  it('keeps existing diary when dates collide', () => {
    const existing = makeDiary({ id: 'existing-id', date: '2026-05-10', text: 'existing' });
    writeAllDiaries([existing]);

    const incoming = makeDiary({ id: 'new-id', date: '2026-05-10', text: 'incoming' });
    const backup = {
      version: 1 as const,
      diaries: [incoming],
      conversations: [],
      settings: {},
    };

    applyBackup(backup, 'merge');

    const diaries = readDiaries();
    expect(diaries).toHaveLength(1);
    expect(diaries[0]?.id).toBe('existing-id');
    expect(diaries[0]?.text).toBe('existing');
  });

  it('appends incoming diary when date is unique', () => {
    const existing = makeDiary({ date: '2026-05-01', text: 'existing' });
    writeAllDiaries([existing]);

    const incoming = makeDiary({ date: '2026-05-02', text: 'incoming' });
    const backup = {
      version: 1 as const,
      diaries: [incoming],
      conversations: [],
      settings: {},
    };

    applyBackup(backup, 'merge');

    const diaries = readDiaries();
    expect(diaries).toHaveLength(2);
  });

  it('keeps existing conversation when ids collide', () => {
    const existing = makeConversation({ id: 'conv-1', title: '기존 대화' });
    writeAllConversations([existing]);

    const incoming = makeConversation({ id: 'conv-1', title: '새 대화' });
    const backup = {
      version: 1 as const,
      diaries: [],
      conversations: [incoming],
      settings: {},
    };

    applyBackup(backup, 'merge');

    const convs = readConversations();
    expect(convs).toHaveLength(1);
    expect(convs[0]?.title).toBe('기존 대화');
  });

  it('appends incoming conversation when id is unique', () => {
    const existing = makeConversation({ id: 'conv-existing' });
    writeAllConversations([existing]);

    const incoming = makeConversation({ id: 'conv-new' });
    const backup = {
      version: 1 as const,
      diaries: [],
      conversations: [incoming],
      settings: {},
    };

    applyBackup(backup, 'merge');

    const convs = readConversations();
    expect(convs).toHaveLength(2);
  });

  it('existing settings keys win on conflict in merge mode', () => {
    writeAllSettings({ theme: 'dark', lang: 'ko' });

    const backup = {
      version: 1 as const,
      diaries: [],
      conversations: [],
      settings: { theme: 'light', newKey: 'value' },
    };

    applyBackup(backup, 'merge');

    const settings = readSettings();
    // Existing 'theme: dark' wins over backup 'theme: light'
    expect(settings['theme']).toBe('dark');
    // Backup-only key is brought in
    expect(settings['newKey']).toBe('value');
    // Existing lang is preserved
    expect(settings['lang']).toBe('ko');
  });
});
