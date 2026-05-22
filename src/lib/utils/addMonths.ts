/**
 * Adds (or subtracts) a signed integer number of months to a "YYYY-MM" string.
 *
 * Year rollover is handled automatically via Date arithmetic.
 *
 * @param yearMonth - "YYYY-MM" format string (e.g. "2026-01").
 * @param delta     - Signed integer month offset.
 * @returns "YYYY-MM" string with delta applied.
 */
export function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
