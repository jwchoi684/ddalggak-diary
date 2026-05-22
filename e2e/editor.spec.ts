import { test, expect } from '@playwright/test';

test('캘린더 빈 셀 → 무드 선택 → 본문 입력 → 자동 저장 → 뒤로 → 캘린더에 무드 표시', async ({ page }) => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Start from the calendar so history has an entry (enables router.back())
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();

  // Navigate to the editor via the FAB (today's date)
  await page.getByRole('button', { name: '오늘 일기 쓰기' }).click();
  await expect(page).toHaveURL(`/diary/${dateStr}`);

  // Mood picker sheet should auto-open
  await expect(page.getByText('오늘은 어떤 하루였나요?')).toBeVisible();

  // Select the first mood (기쁨 / joy)
  await page.getByRole('button', { name: '기쁨' }).click();

  // Sheet should close; editor textarea visible
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toBeVisible();

  // Type in the textarea
  await page.getByPlaceholder('오늘 어떤 하루였나요?').fill('E2E 테스트 일기');

  // Wait for autosave debounce (1000ms + buffer)
  await page.waitForTimeout(1500);

  // Navigate back to calendar via back button
  await page.getByRole('button', { name: '뒤로가기' }).click();

  // Must be back on calendar route
  await expect(page).toHaveURL('/');

  // The calendar should show a mood emoji on today's cell
  // Today's cell should contain non-empty, non-digit-only content (the emoji)
  const todayCell = page.getByRole('button', { name: new RegExp(dateStr) });
  await expect(todayCell).toBeVisible();
  const cellText = await todayCell.textContent();
  expect(cellText?.trim()).not.toBe('');
  expect(cellText).not.toMatch(/^\d+$/);
});
