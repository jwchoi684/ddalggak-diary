"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exportBackup, validateBackup, applyBackup } from '@/lib/backup/backup';
import type { BackupV1 } from '@/lib/backup/backup';
import { Toast } from '@/design-system/Toast';
import { useToast } from '@/design-system/useToast';
import { IconButton } from '@/design-system/IconButton';
import { useSettings } from '@/lib/storage/useSettings';
import { BottomNav } from '@/design-system/BottomNav';

// ─── Icon ─────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      <path
        d="M13 16 L7 10 L13 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Import mode dialog ───────────────────────────────────────────────────────

interface ImportModeDialogProps {
  onOverwrite: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

function ImportModeDialog({ onOverwrite, onMerge, onCancel }: ImportModeDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-mode-title"
      className="fixed inset-0 flex items-center justify-center z-50"
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="relative bg-paper rounded-[var(--radius-card-lg)] p-6 mx-4 w-full max-w-[340px]"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <p id="import-mode-title" className="text-charcoal text-base mb-2 font-medium">
          가져오기 방식 선택
        </p>
        <p className="text-meta text-sm mb-6">
          기존 데이터를 어떻게 처리할까요?
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-testid="import-mode-overwrite"
            onClick={onOverwrite}
            className="min-h-[44px] px-4 rounded-full text-sm font-medium bg-charcoal text-paper"
          >
            덮어쓰기
          </button>
          <button
            type="button"
            data-testid="import-mode-merge"
            onClick={onMerge}
            className="min-h-[44px] px-4 rounded-full text-sm font-medium border border-meta text-charcoal"
          >
            머지
          </button>
          <button
            type="button"
            data-testid="import-mode-cancel"
            onClick={onCancel}
            className="min-h-[44px] px-4 rounded-full text-sm font-medium text-meta"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingBackup, setPendingBackup] = useState<BackupV1 | null>(null);

  // User name (REQ-USER-NAME). Local draft state mirrors storage; saved on blur or 저장 tap.
  const { settings, update: updateSettings } = useSettings();
  const [userNameDraft, setUserNameDraft] = useState<string>('');
  useEffect(() => {
    if (typeof settings.userName === 'string') setUserNameDraft(settings.userName);
  }, [settings.userName]);

  function handleSaveUserName() {
    const trimmed = userNameDraft.trim();
    updateSettings({ userName: trimmed.length > 0 ? trimmed : undefined });
    toast.show('이름을 저장했어요');
  }

  function handleExport() {
    exportBackup();
    toast.show('백업 파일을 저장했어요');
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    const text = await file.text();
    const result = validateBackup(text);

    if (!result.ok) {
      toast.show('파일 형식이 올바르지 않아요');
      return;
    }

    setPendingBackup(result.backup);
  }

  function handleApply(mode: 'overwrite' | 'merge') {
    if (!pendingBackup) return;
    applyBackup(pendingBackup, mode);
    setPendingBackup(null);
    toast.show('가져오기를 완료했어요');
    // Refresh the page so the UI reflects restored data
    router.refresh();
  }

  function handleCancelImport() {
    setPendingBackup(null);
  }

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col">
      <header className="flex items-center px-4 py-3 gap-2">
        <IconButton icon={<BackIcon />} label="뒤로 가기" onClick={() => router.back()} />
        <h1 className="text-xl font-bold text-charcoal ml-2">설정</h1>
      </header>

      <main className="flex-1 px-4 pt-4 pb-8 space-y-6">
        <section>
          <h2 className="text-sm font-medium text-meta mb-3 uppercase tracking-wide">
            내 정보
          </h2>
          <div className="bg-paper rounded-[var(--radius-card-lg)] p-4"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <label htmlFor="user-name-input" className="block text-charcoal text-sm font-medium mb-2">
              이름
            </label>
            <input
              id="user-name-input"
              type="text"
              value={userNameDraft}
              onChange={(e) => setUserNameDraft(e.target.value)}
              placeholder="AI가 부를 이름을 입력하세요"
              maxLength={30}
              data-testid="user-name-input"
              className="w-full min-h-[44px] px-3 rounded-lg border border-meta/30 bg-cream text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-peach"
            />
            <button
              type="button"
              data-testid="user-name-save"
              onClick={handleSaveUserName}
              className="mt-3 min-h-[44px] px-4 rounded-lg bg-peach text-charcoal text-sm font-medium"
            >
              저장
            </button>
            <p className="text-meta text-xs mt-2 leading-relaxed">
              비워두면 일반 호칭으로 부릅니다. AI 채팅의 페르소나가 이 이름으로 말을 걸어요.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-meta mb-3 uppercase tracking-wide">
            데이터 백업
          </h2>

          <div className="bg-paper rounded-[var(--radius-card-lg)] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}>

            <button
              type="button"
              data-testid="export-button"
              onClick={handleExport}
              className="w-full min-h-[52px] px-4 flex items-center text-charcoal text-sm font-medium text-left border-b border-[#F0EBE3]"
            >
              백업 내보내기
            </button>

            <button
              type="button"
              data-testid="import-button"
              onClick={handleImportClick}
              className="w-full min-h-[52px] px-4 flex items-center text-charcoal text-sm font-medium text-left"
            >
              백업 가져오기
            </button>
          </div>
        </section>
      </main>

      {/* Hidden file input — .json only */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="file-input"
        onChange={handleFileChange}
      />

      {/* Import mode selection dialog */}
      {pendingBackup && (
        <ImportModeDialog
          onOverwrite={() => handleApply('overwrite')}
          onMerge={() => handleApply('merge')}
          onCancel={handleCancelImport}
        />
      )}

      <Toast message={toast.message} open={toast.open} onClose={toast.hide} />
      <BottomNav />
    </div>
  );
}
