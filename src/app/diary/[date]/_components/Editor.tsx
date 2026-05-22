"use client";

import React, { useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { upsertDiary, removeDiary, generateId } from '@/lib/storage';
import { Routes } from '@/lib/navigation';
import { MoodPickerSheet } from '@/design-system/MoodPickerSheet';
import { ConfirmDialog } from '@/design-system/ConfirmDialog';
import { Toast } from '@/design-system/Toast';
import { useToast } from '@/design-system/useToast';
import { useEditorState } from '@/lib/hooks/useEditorState';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { EditorHeader } from './EditorHeader';
import { EditorBody } from './EditorBody';
import { EditorToolbar } from './EditorToolbar';
import { EditorMoreMenu } from './EditorMoreMenu';

interface EditorProps {
  date: string; // ISO "YYYY-MM-DD" — validated upstream in page.tsx
}

export function Editor({ date }: EditorProps) {
  const router = useRouter();
  const toast = useToast();
  const [state, dispatch] = useEditorState(date);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorPos = useRef<number | null>(null);

  const isDirty = state.isLoaded && (
    state.mood !== state.snapshot.mood ||
    state.text !== state.snapshot.text ||
    state.textAlign !== state.snapshot.textAlign
  );

  const autosaveValue = useMemo(
    () => ({ mood: state.mood, text: state.text, textAlign: state.textAlign }),
    [state.mood, state.text, state.textAlign],
  );

  const saveFn = useCallback(
    (v: typeof autosaveValue) => {
      if (!v.mood) return;
      const id = state.persistedId ?? generateId();
      const createdAt = state.persistedCreatedAt ?? new Date().toISOString();
      upsertDiary({
        id, date, mood: v.mood, text: v.text, textAlign: v.textAlign,
        photos: [], createdAt, updatedAt: new Date().toISOString(),
      });
      dispatch({ type: 'MARK_SAVED', id, createdAt });
    },
    [state.persistedId, state.persistedCreatedAt, date, dispatch],
  );

  useAutosave(autosaveValue, 1000, saveFn);

  // Restore cursor position after time-insert dispatch
  useLayoutEffect(() => {
    if (pendingCursorPos.current !== null && textareaRef.current) {
      const p = pendingCursorPos.current;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(p, p);
      pendingCursorPos.current = null;
    }
  });

  function handleBack() {
    if (isDirty) {
      dispatch({ type: 'SET_UNSAVED_DIALOG', open: true });
    } else {
      router.back();
    }
  }

  function handleSaveAndBack() {
    saveFn(autosaveValue);
    dispatch({ type: 'SET_UNSAVED_DIALOG', open: false });
    router.back();
  }

  function handleExplicitSave() {
    saveFn(autosaveValue);
    toast.show('일기를 저장했어요!');
    textareaRef.current?.blur();
  }

  function handleDelete() {
    if (state.persistedId) removeDiary(state.persistedId);
    dispatch({ type: 'SET_DELETE_DIALOG', open: false });
    router.back();
  }

  function handleTimeInsert() {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm} `;
    const nextText = state.text.slice(0, start) + timeStr + state.text.slice(end);
    pendingCursorPos.current = start + timeStr.length;
    dispatch({ type: 'INSERT_TIME', nextText });
  }

  return (
    <main className="flex flex-col bg-cream" style={{ height: '100dvh' }}>
      <EditorHeader
        onBack={handleBack}
        onMoreMenu={() => dispatch({ type: 'SET_MORE_MENU', open: true })}
      />

      <EditorBody
        date={date}
        mood={state.mood}
        text={state.text}
        textAlign={state.textAlign}
        onMoodTap={() => dispatch({ type: 'OPEN_MOOD_SHEET' })}
        onTextChange={(text) => dispatch({ type: 'SET_TEXT', text })}
        textareaRef={textareaRef}
      />

      <Toast message={toast.message} open={toast.open} onClose={toast.hide} />

      <EditorToolbar
        isDirty={isDirty}
        textAlign={state.textAlign}
        onAlignToggle={() => dispatch({ type: 'TOGGLE_ALIGN' })}
        onTimeInsert={handleTimeInsert}
        onGalleryTap={() => toast.show('곧 만나요!')}
        onExplicitSave={handleExplicitSave}
      />

      <EditorMoreMenu
        open={state.moreMenuOpen}
        hasSavedEntry={state.persistedId !== undefined}
        onClose={() => dispatch({ type: 'SET_MORE_MENU', open: false })}
        onNavigateList={() => router.push(Routes.list)}
        onDeleteTap={() => dispatch({ type: 'SET_DELETE_DIALOG', open: true })}
      />

      <MoodPickerSheet
        open={state.moodSheetMode !== 'closed'}
        date={date}
        mode={state.moodSheetMode === 'initial' ? 'initial' : 'change'}
        selectedMoodId={state.mood}
        onSelect={(moodId) => dispatch({ type: 'SET_MOOD', mood: moodId })}
        onClose={() => dispatch({ type: 'CLOSE_MOOD_SHEET' })}
        onCancelInitial={() => router.back()}
      />

      <ConfirmDialog
        open={state.unsavedDialogOpen}
        message="저장되지 않은 변경사항이 있어요. 저장하고 나가시겠어요?"
        confirmLabel="저장하고 나가기"
        cancelLabel="계속 작성"
        onConfirm={handleSaveAndBack}
        onCancel={() => dispatch({ type: 'SET_UNSAVED_DIALOG', open: false })}
      />

      <ConfirmDialog
        open={state.deleteDialogOpen}
        message="일기를 삭제할까요? 삭제한 일기는 복구할 수 없어요."
        confirmLabel="삭제"
        cancelLabel="취소"
        destructive
        onConfirm={handleDelete}
        onCancel={() => dispatch({ type: 'SET_DELETE_DIALOG', open: false })}
      />
    </main>
  );
}
