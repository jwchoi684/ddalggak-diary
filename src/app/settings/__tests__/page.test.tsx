// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import {
  mockRouter,
  mockUseRouter,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';

// ─── Navigation mock ──────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  usePathname: () => '/',
}));

// ─── Backup module mock ───────────────────────────────────────────────────────

const mockExportBackup = vi.fn();
const mockValidateBackup = vi.fn();
const mockApplyBackup = vi.fn();

vi.mock('@/lib/backup/backup', () => ({
  exportBackup: (...args: unknown[]) => mockExportBackup(...args),
  validateBackup: (...args: unknown[]) => mockValidateBackup(...args),
  applyBackup: (...args: unknown[]) => mockApplyBackup(...args),
}));

// ─── Import page after mocks ──────────────────────────────────────────────────

const { default: SettingsPage } = await import('@/app/settings/page');

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  resetNavigationMocks();
  vi.clearAllMocks();
  // Default: exportBackup is a no-op, validateBackup returns valid
  mockExportBackup.mockImplementation(() => {});
  mockValidateBackup.mockReturnValue({
    ok: true,
    backup: { version: 1, diaries: [], conversations: [], settings: {} },
  });
  mockApplyBackup.mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});

// ─── SP1: export button calls exportBackup and shows toast ───────────────────

describe('SP1: export button', () => {
  it('calls exportBackup() and shows success toast when export button is clicked', async () => {
    render(<SettingsPage />);

    const exportBtn = screen.getByTestId('export-button');
    expect(exportBtn).toBeTruthy();
    expect(exportBtn.textContent).toBe('백업 내보내기');

    await act(async () => {
      fireEvent.click(exportBtn);
    });

    expect(mockExportBackup).toHaveBeenCalledTimes(1);
    expect(screen.getByText('백업 파일을 저장했어요')).toBeTruthy();
  });
});

// ─── SP2: import with invalid file shows error toast ─────────────────────────

describe('SP2: import — invalid file', () => {
  it('shows error toast and does NOT call applyBackup when validateBackup returns ok: false', async () => {
    mockValidateBackup.mockReturnValue({ ok: false, reason: 'JSON 파싱 실패' });

    render(<SettingsPage />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['not json'], 'bad.json', { type: 'application/json' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Small wait for async file.text() resolution
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockApplyBackup).not.toHaveBeenCalled();
    expect(screen.getByText('파일 형식이 올바르지 않아요')).toBeTruthy();
  });
});

// ─── SP3: import success — mode dialog shown, apply called, page refreshed ───

describe('SP3: import — success flow', () => {
  it('shows mode dialog after valid file, calls applyBackup(overwrite) on confirm', async () => {
    const fakeBackup = { version: 1 as const, diaries: [], conversations: [], settings: {} };
    mockValidateBackup.mockReturnValue({ ok: true, backup: fakeBackup });

    render(<SettingsPage />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(
      [JSON.stringify(fakeBackup)],
      'backup.json',
      { type: 'application/json' },
    );

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Async file.text() resolution
    await act(async () => {
      await Promise.resolve();
    });

    // Mode dialog must be visible
    expect(screen.getByTestId('import-mode-overwrite')).toBeTruthy();
    expect(screen.getByTestId('import-mode-merge')).toBeTruthy();

    // Click overwrite
    await act(async () => {
      fireEvent.click(screen.getByTestId('import-mode-overwrite'));
    });

    expect(mockApplyBackup).toHaveBeenCalledWith(fakeBackup, 'overwrite');
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText('가져오기를 완료했어요')).toBeTruthy();
  });

  it('calls applyBackup(merge) when merge option is chosen', async () => {
    const fakeBackup = { version: 1 as const, diaries: [], conversations: [], settings: {} };
    mockValidateBackup.mockReturnValue({ ok: true, backup: fakeBackup });

    render(<SettingsPage />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File([JSON.stringify(fakeBackup)], 'backup.json', { type: 'application/json' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('import-mode-merge'));
    });

    expect(mockApplyBackup).toHaveBeenCalledWith(fakeBackup, 'merge');
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
  });

  it('cancels import when cancel is clicked in mode dialog', async () => {
    const fakeBackup = { version: 1 as const, diaries: [], conversations: [], settings: {} };
    mockValidateBackup.mockReturnValue({ ok: true, backup: fakeBackup });

    render(<SettingsPage />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File([JSON.stringify(fakeBackup)], 'backup.json', { type: 'application/json' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Mode dialog shown
    expect(screen.getByTestId('import-mode-cancel')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId('import-mode-cancel'));
    });

    // After cancel, dialog should be gone
    expect(screen.queryByTestId('import-mode-cancel')).toBeNull();
    expect(mockApplyBackup).not.toHaveBeenCalled();
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });
});
