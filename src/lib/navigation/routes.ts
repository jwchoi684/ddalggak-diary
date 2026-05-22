/**
 * Type-safe route builder for 딸깍일기.
 * Import via: import { Routes } from '@/lib/navigation'
 */
export const Routes = {
  /** Calendar root screen. Always '/'. */
  calendar: '/' as const,

  /**
   * Diary editor for a specific date.
   * @param date - ISO 8601 date string, e.g. '2026-05-17'
   * @returns '/diary/2026-05-17'
   */
  diary: (date: string): string => `/diary/${date}`,

  /** Diary list screen (no filters). Always '/list'. */
  list: '/list' as const,

  /**
   * Diary list with optional month and sort filters.
   * Params are set in fixed order (month → sort) for deterministic URLs.
   * @param params.month - 'YYYY-MM' format; omit to leave unset
   * @param params.sort  - 'asc' | 'desc'; omit to leave unset
   * @returns '/list', '/list?month=YYYY-MM', '/list?sort=asc|desc',
   *          or '/list?month=YYYY-MM&sort=asc|desc'
   */
  listWithFilter: (params: { month?: string; sort?: 'asc' | 'desc' }): string => {
    const sp = new URLSearchParams();
    if (params.month) sp.set('month', params.month);
    if (params.sort)  sp.set('sort', params.sort);
    const qs = sp.toString();
    return qs ? `/list?${qs}` : '/list';
  },

  /** AI chat screen. Always '/chat'. */
  chat: '/chat' as const,

  /** Stats screen. Always '/stats'. */
  stats: '/stats' as const,

  /** Settings screen. Always '/settings'. */
  settings: '/settings' as const,
} as const;
