import { test, expect } from '@playwright/test';

test('캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동', async ({ page }) => {
  await page.goto('/');

  const today = new Date();
  const monthLabel = `${today.getMonth() + 1}월`;
  await expect(page.getByText(monthLabel)).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();

  await page.getByRole('button', { name: '오늘 일기 쓰기' }).click();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  await expect(page).toHaveURL(`/diary/${yyyy}-${mm}-${dd}`);
});
