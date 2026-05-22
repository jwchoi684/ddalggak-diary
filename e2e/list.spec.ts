import { test, expect } from '@playwright/test';
import { seedDiariesScript } from './_helpers/seedDiaries';
import type { DiaryEntry } from '@/lib/storage/types';

test('LE1: seed 2 entries → /list shows 2 cards → tap first → editor opens → URL matches /diary/', async ({ page }) => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');

  const e1: DiaryEntry = {
    id: 'e1',
    date: `${yyyy}-${mm}-10`,
    mood: 'joy',
    text: '첫 번째 일기',
    textAlign: 'left',
    photos: [],
    createdAt: `${yyyy}-${mm}-10T00:00:00.000Z`,
    updatedAt: `${yyyy}-${mm}-10T00:00:00.000Z`,
  };
  const e2: DiaryEntry = {
    id: 'e2',
    date: `${yyyy}-${mm}-20`,
    mood: 'calm',
    text: '두 번째 일기',
    textAlign: 'left',
    photos: [],
    createdAt: `${yyyy}-${mm}-20T00:00:00.000Z`,
    updatedAt: `${yyyy}-${mm}-20T00:00:00.000Z`,
  };

  await page.addInitScript(seedDiariesScript([e1, e2]));
  await page.goto('/list');

  // Both card buttons should be visible
  const cards = page.getByRole('button', { name: /일기 보기/ });
  await expect(cards).toHaveCount(2);

  // Click the first card (newest first = e2 on the 20th)
  await cards.first().click();

  // Should navigate to /diary/[date]
  await expect(page).toHaveURL(/\/diary\//);

  // Editor textarea should be visible
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toBeVisible();
});
