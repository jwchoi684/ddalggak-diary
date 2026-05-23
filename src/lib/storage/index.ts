/**
 * Public API for the ddalkkak-diary localStorage abstraction layer.
 *
 * All callers import exclusively from '@/lib/storage'.
 * No caller should import from sub-paths (e.g. '@/lib/storage/ssr').
 * Storage-key constants (keys.ts) are internal and not re-exported.
 */

// Types
export type {
  MoodId,
  Mood,
  ActivityId,
  Activity,
  PickerId,
  PersonaId,
  Persona,
  Photo,
  DiaryEntry,
  ChatMessage,
  SearchConversation,
  Settings,
} from './types';

// Diary operations
export {
  readDiaries,
  writeAllDiaries,
  upsertDiary,
  removeDiary,
} from './diaries';

// Conversation operations
export {
  readConversations,
  writeAllConversations,
  upsertConversation,
  removeConversation,
} from './conversations';

// Settings operations
export { readSettings, writeSettings, writeAllSettings } from './settings';

// Utilities
export { generateId } from './uuid';

// Capacity constants (REQ-011 enforces these before calling upsertDiary)
export { MAX_PHOTO_DATAURL_BYTES, MAX_PHOTOS_PER_ENTRY } from './limits';
