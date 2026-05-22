/**
 * formatListDate — converts "YYYY-MM-DD" to "YYYY.MM.DD 요일"
 *
 * Uses new Date(isoDate + 'T00:00:00') to parse in local time,
 * avoiding UTC offset shifts that would flip the weekday.
 */

const WEEKDAY_FMT = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' });

export function formatListDate(isoDate: string): string {
  // Preserve leading zeros via string slices rather than Intl formatting
  const datePart = `${isoDate.slice(0, 4)}.${isoDate.slice(5, 7)}.${isoDate.slice(8, 10)}`;
  const weekday = WEEKDAY_FMT.format(new Date(isoDate + 'T00:00:00'));
  return `${datePart} ${weekday}`;
}
