import { test, expect } from '@playwright/test';
import { seedDiariesScript } from './_helpers/seedDiaries';
import type { DiaryEntry } from '@/lib/storage/types';

function isoDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the Korean-locale aria-label that DateCell renders for a given ISO date.
 * Must match the `toKoreanDateLabel` helper in DateCell.tsx exactly.
 */
function toKoreanLabel(isoDateStr: string): string {
  const d = new Date(isoDateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

test('E1: switch from date A to date B — date A preserved, editor shows B, URL stays at A', async ({ page }) => {
  const DATE_A = isoDate(-1);
  const DATE_B = isoDate(0);

  const entryA: DiaryEntry = {
    id: 'e2e-a',
    date: DATE_A,
    mood: 'joy',
    text: 'Entry A text',
    textAlign: 'left',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const entryB: DiaryEntry = {
    id: 'e2e-b',
    date: DATE_B,
    mood: 'calm',
    text: 'Entry B text',
    textAlign: 'left',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.addInitScript(seedDiariesScript([entryA, entryB]));
  await page.goto(`/diary/${DATE_A}`);

  // Editor for date A loaded
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toHaveValue('Entry A text');

  // Open horizontal date strip
  await page.getByRole('button', { name: '날짜 선택' }).click();
  await expect(page.getByRole('listbox', { name: '가로 캘린더' })).toBeVisible();

  // Tap the cell for DATE_B — use full Korean label to avoid matching an earlier month's same day
  await page.getByRole('option', { name: toKoreanLabel(DATE_B) }).click();

  // URL must NOT change — stays at date A
  await expect(page).toHaveURL(`/diary/${DATE_A}`);

  // Editor body now shows date B's content
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toHaveValue('Entry B text');

  // Strip must be closed
  await expect(page.getByRole('listbox', { name: '가로 캘린더' })).not.toBeVisible();

  // Date A's localStorage entry is still intact
  const storedRaw = await page.evaluate(() =>
    localStorage.getItem('ddalkkak:diaries:v1'),
  );
  const stored: DiaryEntry[] = JSON.parse(storedRaw ?? '[]');
  const preservedA = stored.find((e: DiaryEntry) => e.id === 'e2e-a');
  expect(preservedA).toBeTruthy();
  expect(preservedA?.text).toBe('Entry A text');
});

test('E2: no-mood on date A — date switch does not persist a partial entry for date A', async ({ page }) => {
  const DATE_A = isoDate(-2);
  const DATE_B = isoDate(-1);

  // Seed only date B; date A has no entry (will open as new entry with mood picker)
  const entryB: DiaryEntry = {
    id: 'e2e-b2',
    date: DATE_B,
    mood: 'sad',
    text: 'Entry B only',
    textAlign: 'left',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.addInitScript(seedDiariesScript([entryB]));

  // Navigate to date A (no entry → mood picker opens automatically)
  await page.goto(`/diary/${DATE_A}`);

  // Dismiss mood picker without selecting via the close button (닫기).
  // onCancelInitial is intentionally unset so closing the sheet stays on the editor.
  await page.getByRole('button', { name: '닫기' }).click();

  // Wait for editor to be interactive (mood picker closed)
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toBeVisible();

  // Type some text without selecting a mood
  await page.getByPlaceholder('오늘 어떤 하루였나요?').fill('Unsaved text no mood');

  // Open strip and switch to date B — use full Korean label to target correct cell
  await page.getByRole('button', { name: '날짜 선택' }).click();
  await expect(page.getByRole('listbox', { name: '가로 캘린더' })).toBeVisible();

  await page.getByRole('option', { name: toKoreanLabel(DATE_B) }).click();

  // Editor shows date B content
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toHaveValue('Entry B only');

  // Date A must NOT have been written to localStorage (saveFn exits early when mood=undefined)
  const storedRaw = await page.evaluate(() =>
    localStorage.getItem('ddalkkak:diaries:v1'),
  );
  const stored: DiaryEntry[] = JSON.parse(storedRaw ?? '[]');
  const spuriousA = stored.find((e: DiaryEntry) => e.date === DATE_A);
  expect(spuriousA).toBeUndefined();
});
