import { test, expect } from '@playwright/test';
import { seedDiariesScript } from './_helpers/seedDiaries';
import type { DiaryEntry } from '@/lib/storage/types';

test('PV-E1: tap thumbnail → viewer visible → click 닫기 → viewer dismissed', async ({ page }) => {
  const photo1 = {
    id: 'e2e-photo-1',
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    width: 1,
    height: 1,
    addedAt: new Date().toISOString(),
  };
  const photo2 = {
    id: 'e2e-photo-2',
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    width: 1,
    height: 1,
    addedAt: new Date().toISOString(),
  };

  const entry: DiaryEntry = {
    id: 'e2e-diary-1',
    date: '2026-05-01',
    mood: 'joy',
    text: 'E2E photo viewer test',
    textAlign: 'left',
    photos: [photo1, photo2],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.addInitScript(seedDiariesScript([entry]));
  await page.goto('/diary/2026-05-01');

  // Viewer image should not be visible before tap
  await expect(page.getByTestId('photo-viewer-img')).not.toBeVisible();

  // Tap first thumbnail
  await page.getByTestId(`photo-thumb-${photo1.id}`).click();

  // Viewer image should now be visible
  await expect(page.getByTestId('photo-viewer-img')).toBeVisible();

  // Click close button
  await page.getByRole('button', { name: '닫기' }).click();

  // Viewer image should be dismissed
  await expect(page.getByTestId('photo-viewer-img')).not.toBeVisible();
});
