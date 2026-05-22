import { test, expect } from '@playwright/test';
import path from 'path';
import { seedDiariesScript, seedDiariesOnceScript } from './_helpers/seedDiaries';
import type { DiaryEntry } from '@/lib/storage/types';

const FIXTURE_1X1 = path.join(__dirname, 'fixtures', '1x1.png');

function makeBaseEntry(date: string): DiaryEntry {
  return {
    id: `e2e-entry-${date}`,
    date,
    mood: 'joy',
    text: 'E2E photo test',
    textAlign: 'left',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makePhotoEntry(date: string): DiaryEntry {
  const photos = Array.from({ length: 10 }, (_, i) => ({
    id: `e2e-photo-${i}`,
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    width: 1,
    height: 1,
    addedAt: new Date().toISOString(),
  }));
  return { ...makeBaseEntry(date), photos };
}

test('PE1: 사진 추가 → 자동 저장 → 재진입 시 카로젤 보존', async ({ page }) => {
  const date = '2026-05-15';

  // Use "once" variant: seed runs on first load but does NOT overwrite on reload,
  // so the autosaved photo survives the page.reload() below.
  await page.addInitScript(seedDiariesOnceScript([makeBaseEntry(date)]));
  await page.goto(`/diary/${date}`);

  // Photo carousel should not be visible initially
  await expect(page.locator('[data-testid="photo-carousel"]')).toHaveCount(0);

  // Upload a photo via file input
  await page.setInputFiles('input[type="file"]', FIXTURE_1X1);

  // Carousel should now be visible with 1 thumbnail
  await expect(page.locator('[data-testid="photo-carousel"]')).toBeVisible();
  await expect(page.locator('[data-testid^="photo-thumb-"]')).toHaveCount(1);

  // Wait for autosave debounce (1000ms + buffer)
  await page.waitForTimeout(1500);

  // Reload and verify photo persists
  await page.reload();
  await expect(page.locator('[data-testid="photo-carousel"]')).toBeVisible();
  await expect(page.locator('[data-testid^="photo-thumb-"]')).toHaveCount(1);
});

test('PE2: 10장이면 갤러리 버튼 disabled', async ({ page }) => {
  const date = '2026-05-16';

  await page.addInitScript(seedDiariesScript([makePhotoEntry(date)]));
  await page.goto(`/diary/${date}`);

  // Gallery button should be disabled when 10 photos exist
  const galleryBtn = page.getByRole('button', { name: '갤러리' });
  await expect(galleryBtn).toBeDisabled();
});
