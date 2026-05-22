/**
 * formatRelativeTime — converts an ISO 8601 timestamp to a Korean relative time string.
 *
 * Thresholds (based on diff = now - iso, in milliseconds):
 *   < 0  (future/negative) → "방금"
 *   < 60s                  → "방금"
 *   < 60min                → "{X}분 전"
 *   < 24h                  → "{X}시간 전"
 *   yesterday (calendar)   → "어제"
 *   < 7 days               → "{X}일 전"
 *   else                   → "YYYY.M.D" (no zero-pad)
 *
 * @param iso - ISO 8601 timestamp string (e.g. "2026-05-22T10:00:00.000Z")
 * @param now - Optional override for current time (useful in tests). Defaults to new Date().
 * @returns Korean relative time string.
 */
export function formatRelativeTime(iso: string, now?: Date): string {
  const reference = now ?? new Date();
  const target = new Date(iso);

  const diffMs = reference.getTime() - target.getTime();

  // Negative diff (future date) → "방금"
  if (diffMs < 0) {
    return '방금';
  }

  const diffSeconds = Math.floor(diffMs / 1000);

  // < 60 seconds → "방금"
  if (diffSeconds < 60) {
    return '방금';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  // < 60 minutes → "{X}분 전"
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  // < 24 hours → "{X}시간 전"
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  // Check if target is "yesterday" in local calendar
  const referenceDate = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const targetDate = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const calendarDayDiff = Math.round(
    (referenceDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (calendarDayDiff === 1) {
    return '어제';
  }

  // < 7 calendar days → "{X}일 전"
  if (calendarDayDiff < 7) {
    return `${calendarDayDiff}일 전`;
  }

  // 7+ days → "YYYY.M.D" (no zero-padding)
  const y = target.getFullYear();
  const m = target.getMonth() + 1;
  const d = target.getDate();
  return `${y}.${m}.${d}`;
}
