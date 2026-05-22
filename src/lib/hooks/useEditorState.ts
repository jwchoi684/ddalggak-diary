"use client";

import { useReducer, useEffect, type Dispatch } from 'react';
import { readDiaries } from '@/lib/storage';
import type { MoodId, DiaryEntry } from '@/lib/storage';

export interface EditorState {
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  persistedId: string | undefined;
  persistedCreatedAt: string | undefined;
  snapshot: { mood: MoodId | undefined; text: string; textAlign: 'left' | 'center' };
  isLoaded: boolean;
  moodSheetMode: 'initial' | 'change' | 'closed';
  moreMenuOpen: boolean;
  unsavedDialogOpen: boolean;
  deleteDialogOpen: boolean;
}

export type EditorAction =
  | { type: 'LOAD_ENTRY'; entry: DiaryEntry | undefined }
  | { type: 'SET_MOOD'; mood: MoodId }
  | { type: 'SET_TEXT'; text: string }
  | { type: 'TOGGLE_ALIGN' }
  | { type: 'INSERT_TIME'; nextText: string }
  | { type: 'MARK_SAVED'; id: string; createdAt: string }
  | { type: 'OPEN_MOOD_SHEET' }
  | { type: 'CLOSE_MOOD_SHEET' }
  | { type: 'SET_MORE_MENU'; open: boolean }
  | { type: 'SET_UNSAVED_DIALOG'; open: boolean }
  | { type: 'SET_DELETE_DIALOG'; open: boolean };

const EMPTY_SNAPSHOT = { mood: undefined as MoodId | undefined, text: '', textAlign: 'left' as const };

const INITIAL_STATE: EditorState = {
  mood: undefined,
  text: '',
  textAlign: 'left',
  persistedId: undefined,
  persistedCreatedAt: undefined,
  snapshot: EMPTY_SNAPSHOT,
  isLoaded: false,
  moodSheetMode: 'closed',
  moreMenuOpen: false,
  unsavedDialogOpen: false,
  deleteDialogOpen: false,
};

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_ENTRY': {
      if (!action.entry) {
        return { ...INITIAL_STATE, isLoaded: true, moodSheetMode: 'initial' };
      }
      const { id, createdAt, mood, text, textAlign } = action.entry;
      const ta = textAlign ?? 'left';
      const snapshot = { mood, text, textAlign: ta };
      return {
        ...INITIAL_STATE,
        mood,
        text,
        textAlign: ta,
        persistedId: id,
        persistedCreatedAt: createdAt,
        snapshot,
        isLoaded: true,
        moodSheetMode: 'closed',
      };
    }
    case 'SET_MOOD':
      return { ...state, mood: action.mood };
    case 'SET_TEXT':
      return { ...state, text: action.text };
    case 'TOGGLE_ALIGN':
      return { ...state, textAlign: state.textAlign === 'left' ? 'center' : 'left' };
    case 'INSERT_TIME':
      return { ...state, text: action.nextText };
    case 'MARK_SAVED':
      return {
        ...state,
        persistedId: action.id,
        persistedCreatedAt: action.createdAt,
        snapshot: { mood: state.mood, text: state.text, textAlign: state.textAlign },
      };
    case 'OPEN_MOOD_SHEET':
      return { ...state, moodSheetMode: 'change' };
    case 'CLOSE_MOOD_SHEET':
      return { ...state, moodSheetMode: 'closed' };
    case 'SET_MORE_MENU':
      return { ...state, moreMenuOpen: action.open };
    case 'SET_UNSAVED_DIALOG':
      return { ...state, unsavedDialogOpen: action.open };
    case 'SET_DELETE_DIALOG':
      return { ...state, deleteDialogOpen: action.open };
    default:
      return state;
  }
}

export function useEditorState(date: string): [EditorState, Dispatch<EditorAction>] {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    const entry = readDiaries().find((e) => e.date === date);
    dispatch({ type: 'LOAD_ENTRY', entry });
  }, [date]);

  return [state, dispatch];
}
