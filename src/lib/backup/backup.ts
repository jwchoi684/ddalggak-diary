import {
  readDiaries,
  writeAllDiaries,
  readConversations,
  writeAllConversations,
  readSettings,
  writeAllSettings,
} from '@/lib/storage';
import type { DiaryEntry, SearchConversation } from '@/lib/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupV1 {
  version: 1;
  diaries: DiaryEntry[];
  conversations: SearchConversation[];
  settings: Record<string, unknown>;
}

// ─── Build ────────────────────────────────────────────────────────────────────

/**
 * Reads all data from localStorage via the storage layer and assembles a BackupV1.
 */
export function buildBackup(): BackupV1 {
  return {
    version: 1,
    diaries: readDiaries(),
    conversations: readConversations(),
    settings: readSettings() as Record<string, unknown>,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Builds a BackupV1 snapshot and triggers a JSON file download in the browser.
 * Filename: ddalkkak-backup-YYYYMMDD-HHmm.json
 * No-op during SSR.
 */
export function exportBackup(): void {
  if (typeof window === 'undefined') return;

  const backup = buildBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const filename = `ddalkkak-backup-${yyyy}${mm}${dd}-${hh}${min}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Validate ─────────────────────────────────────────────────────────────────

export type ValidateResult =
  | { ok: true; backup: BackupV1 }
  | { ok: false; reason: string };

/**
 * Parses and validates a raw JSON string as BackupV1.
 * Returns { ok: false, reason } on any structural problem.
 * Never throws.
 */
export function validateBackup(text: string): ValidateResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'JSON 파싱 실패' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: '최상위 값이 객체가 아닙니다' };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj['version'] !== 1) {
    return {
      ok: false,
      reason: `지원하지 않는 백업 버전: ${String(obj['version'])}`,
    };
  }

  if (!Array.isArray(obj['diaries'])) {
    return { ok: false, reason: 'diaries 필드가 배열이 아닙니다' };
  }

  if (!Array.isArray(obj['conversations'])) {
    return { ok: false, reason: 'conversations 필드가 배열이 아닙니다' };
  }

  const settings: Record<string, unknown> =
    typeof obj['settings'] === 'object' &&
    obj['settings'] !== null &&
    !Array.isArray(obj['settings'])
      ? (obj['settings'] as Record<string, unknown>)
      : {};

  return {
    ok: true,
    backup: {
      version: 1,
      diaries: obj['diaries'] as DiaryEntry[],
      conversations: obj['conversations'] as SearchConversation[],
      settings,
    },
  };
}

// ─── Apply ────────────────────────────────────────────────────────────────────

/**
 * Writes a validated BackupV1 to localStorage.
 *
 * overwrite — replaces all three keys directly.
 * merge     — deduplicates by id (existing wins on conflict), then writes back.
 *             For diaries, dedup is by `date` field (one-per-day invariant).
 *             For conversations, dedup is by `id`.
 *             For settings, existing keys win (shallow merge, existing takes precedence).
 */
export function applyBackup(backup: BackupV1, mode: 'overwrite' | 'merge'): void {
  if (mode === 'overwrite') {
    writeAllDiaries(backup.diaries);
    writeAllConversations(backup.conversations);
    writeAllSettings(backup.settings);
    return;
  }

  // merge mode ──────────────────────────────────────────────────────────────
  const existingDiaries = readDiaries();
  const existingConvs = readConversations();

  // Diaries: dedup by date (keep existing on conflict)
  const diaryDateSet = new Set(existingDiaries.map((d) => d.date));
  const mergedDiaries: DiaryEntry[] = [...existingDiaries];
  for (const incoming of backup.diaries) {
    if (!diaryDateSet.has(incoming.date)) {
      mergedDiaries.push(incoming);
      diaryDateSet.add(incoming.date);
    }
  }
  writeAllDiaries(mergedDiaries);

  // Conversations: dedup by id (keep existing on conflict)
  const convIdSet = new Set(existingConvs.map((c) => c.id));
  const mergedConvs: SearchConversation[] = [...existingConvs];
  for (const incoming of backup.conversations) {
    if (!convIdSet.has(incoming.id)) {
      mergedConvs.push(incoming);
    }
  }
  writeAllConversations(mergedConvs);

  // Settings: existing keys win on conflict
  const existingSettings = readSettings() as Record<string, unknown>;
  const mergedSettings: Record<string, unknown> = {
    ...backup.settings,
    ...existingSettings,
  };
  writeAllSettings(mergedSettings);
}
