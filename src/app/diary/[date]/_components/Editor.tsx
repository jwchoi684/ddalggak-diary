"use client";

import React, { useState, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { upsertDiary, removeDiary, generateId, MAX_PHOTOS_PER_ENTRY } from '@/lib/storage';
import { Routes } from '@/lib/navigation';
import { MoodPickerSheet } from '@/design-system/MoodPickerSheet';
import { ConfirmDialog } from '@/design-system/ConfirmDialog';
import { Toast } from '@/design-system/Toast';
import { useToast } from '@/design-system/useToast';
import { useEditorState } from '@/lib/hooks/useEditorState';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { useHorizontalDatePicker } from '@/lib/hooks/useHorizontalDatePicker';
import { addPhotoFromFile } from '@/lib/storage/photoBase64';
import { EditorHeader } from './EditorHeader';
import { EditorBody } from './EditorBody';
import { EditorToolbar } from './EditorToolbar';
import { EditorMoreMenu } from './EditorMoreMenu';
import { PhotoCarousel } from './PhotoCarousel';
import { PhotoViewer } from './PhotoViewer';
import { usePhotoViewer } from '@/lib/hooks/usePhotoViewer';

interface EditorProps {
  date: string; // ISO "YYYY-MM-DD" — validated upstream in page.tsx
}

export function Editor({ date }: EditorProps) {
  const router = useRouter();
  const toast = useToast();

  // REQ-010: currentDate is mutable; initialised from the URL route param.
  // URL stays at original `date` (stale by design — no router.replace).
  const [currentDate, setCurrentDate] = useState(date);

  const [state, dispatch] = useEditorState(currentDate);
  const { viewerOpen, viewerInitialIndex, openViewer, closeViewer } = usePhotoViewer(state.photos);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorPos = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessing = useRef(false);

  const isDirty = state.isLoaded && (
    state.mood !== state.snapshot.mood ||
    state.text !== state.snapshot.text ||
    state.textAlign !== state.snapshot.textAlign
  );

  const autosaveValue = useMemo(
    () => ({ mood: state.mood, text: state.text, textAlign: state.textAlign, photos: state.photos }),
    [state.mood, state.text, state.textAlign, state.photos],
  );

  // saveAt — generalized save that takes the date explicitly. saveFn (used by
  // autosave) is just saveAt bound to the current picker date.
  const saveAt = useCallback(
    (v: typeof autosaveValue, atDate: string) => {
      if (!v.mood) return;
      const id = state.persistedId ?? generateId();
      const createdAt = state.persistedCreatedAt ?? new Date().toISOString();
      try {
        upsertDiary({
          id, date: atDate, mood: v.mood, text: v.text, textAlign: v.textAlign,
          photos: v.photos, createdAt, updatedAt: new Date().toISOString(),
        });
      } catch {
        toast.show('저장에 실패했어요. 다시 시도해주세요.');
        return;
      }
      dispatch({ type: 'MARK_SAVED', id, createdAt });
    },
    [state.persistedId, state.persistedCreatedAt, dispatch, toast],
  );

  const saveFn = useCallback(
    (v: typeof autosaveValue) => saveAt(v, currentDate),
    [saveAt, currentDate],
  );

  useAutosave(autosaveValue, 1000, saveFn);

  // REQ-010: horizontal date strip.
  // Picker change semantics: rebind the in-flight draft to the new date — same
  // entry id, just a different date. saveAt is called with newDate inside the
  // onDateChange callback so the draft is persisted under the new date in the
  // same tick (closure on currentDate would still be the OLD date here).
  const strip = useHorizontalDatePicker({
    currentDate,
    saveFn,
    autosaveValue,
    onDateChange: (newDate) => {
      saveAt(autosaveValue, newDate);
      setCurrentDate(newDate);
    },
    onSaveError: (msg) => toast.show(msg),
  });

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
    router.push('/');
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

  function handleGalleryTap() {
    if (isProcessing.current) return;
    if (state.photos.length >= MAX_PHOTOS_PER_ENTRY) {
      toast.show('최대 10장입니다');
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    isProcessing.current = true;
    const result = await addPhotoFromFile(file, state.photos.length);
    isProcessing.current = false;
    if (!result.ok) {
      if (result.reason === 'count_exceeded') toast.show('최대 10장입니다');
      else if (result.reason === 'size_exceeded') toast.show('파일이 너무 큽니다');
      else toast.show('사진을 불러오지 못했어요');
      return;
    }
    dispatch({ type: 'ADD_PHOTO', photo: result.photo });
  }

  return (
    <main className="flex flex-col bg-cream" style={{ height: '100dvh' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <EditorHeader
        onBack={handleBack}
        onMoreMenu={() => dispatch({ type: 'SET_MORE_MENU', open: true })}
      />

      <EditorBody
        date={currentDate}
        mood={state.mood}
        text={state.text}
        textAlign={state.textAlign}
        onMoodTap={() => dispatch({ type: 'OPEN_MOOD_SHEET' })}
        onTextChange={(text) => dispatch({ type: 'SET_TEXT', text })}
        textareaRef={textareaRef}
        stripOpen={strip.isOpen}
        onDateLabelTap={strip.toggle}
        dateRange={strip.dateRange}
        entryMap={strip.entryMap}
        onDateSelect={strip.handleDateSelect}
        photosSlot={
          <PhotoCarousel
            photos={state.photos}
            onDelete={(id) => dispatch({ type: 'DELETE_PHOTO', id })}
            onThumbnailTap={openViewer}
          />
        }
      />

      <PhotoViewer
        photos={state.photos}
        open={viewerOpen}
        initialIndex={viewerInitialIndex}
        onClose={closeViewer}
      />

      <Toast message={toast.message} open={toast.open} onClose={toast.hide} />

      <EditorToolbar
        isDirty={isDirty}
        textAlign={state.textAlign}
        onAlignToggle={() => dispatch({ type: 'TOGGLE_ALIGN' })}
        onTimeInsert={handleTimeInsert}
        onGalleryTap={handleGalleryTap}
        onExplicitSave={handleExplicitSave}
        galleryDisabled={state.photos.length >= MAX_PHOTOS_PER_ENTRY}
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
        date={currentDate}
        mode={state.moodSheetMode === 'initial' ? 'initial' : 'change'}
        selectedId={state.mood}
        onSelect={(id) => dispatch({ type: 'SET_MOOD', mood: id })}
        onClose={() => dispatch({ type: 'CLOSE_MOOD_SHEET' })}
        onCancelInitial={undefined}
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
