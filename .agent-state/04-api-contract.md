# API / Interface Contract — REQ-006

## Scope

Two surfaces: (1) Next.js App Router route contracts — URL paths, handler files, accepted params, and HTTP status codes — and (2) the internal TypeScript module contract for `@/lib/navigation`, including the `Routes` helper and the shared `next/navigation` Vitest mock helper. No external HTTP endpoints or backend changes are involved.

---

## Route Contracts

| Path | Handler file | Component type | Dynamic params | Query params | Status codes | Owner REQ |
|---|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Server | none | none | 200 | REQ-007 |
| `/diary/[date]` | `src/app/diary/[date]/page.tsx` | Server (async) | `date: string` (path segment) | none | 200, 404 | REQ-009 |
| `/list` | `src/app/list/page.tsx` | Server | none | `month=YYYY-MM`, `sort=asc\|desc` | 200 | REQ-013 |
| `/chat` | `src/app/chat/page.tsx` | Server | none | none | 200 | REQ-015 |
| `/stats` | `src/app/stats/page.tsx` | Server | none | none | 200 | REQ-014 |
| `*` (all unmatched) | `src/app/not-found.tsx` | Server | none | none | 404 | REQ-006 |

Route notes:
- `/diary/[date]` returns 404 if `date` does not match `/^\d{4}-\d{2}-\d{2}$/`. Semantic date validation (e.g., Feb 31) is deferred to REQ-009.
- `/list` query params are optional; omitting either leaves the page at default state. Both params are deep-linkable and round-trippable via `Routes.listWithFilter(params)`.
- No `"use client"` directive in any REQ-006 shell file. Client Components belong to later screen REQs.

---

## Public Exports from `@/lib/navigation`

```ts
// src/lib/navigation/routes.ts

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
} as const;
```

Barrel (`src/lib/navigation/index.ts`) re-exports `Routes` so callers write `import { Routes } from '@/lib/navigation'`.

---

## Test Helper Exports from `@/lib/navigation/__tests__/setupNextNavigation`

```ts
// Mutable mock for the Next.js router object
export const mockRouter: {
  push:     ReturnType<typeof vi.fn>;
  replace:  ReturnType<typeof vi.fn>;
  back:     ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
  refresh:  ReturnType<typeof vi.fn>;
  forward:  ReturnType<typeof vi.fn>;
};

// Throws Error('NEXT_NOT_FOUND') to simulate Next.js notFound()
export const mockNotFound: ReturnType<typeof vi.fn>;

// Drop-in implementations for vi.mock factory
export function mockUseRouter(): typeof mockRouter;
export function mockUseSearchParams(): URLSearchParams;
export function mockUseParams(): Record<string, string>;
export function mockUsePathname(): string;

// Call in beforeEach to reset all mocks; re-applies throw behavior on mockNotFound
export function resetNavigationMocks(): void;
```

**When to use.** Any test file that renders a Client Component calling `useRouter`/`useSearchParams`/`useParams`/`usePathname`, or that invokes `notFound()`, must add at the top:

```ts
import { mockRouter, mockNotFound, mockUseRouter, mockUseSearchParams,
         mockUseParams, mockUsePathname, resetNavigationMocks }
  from '@/lib/navigation/__tests__/setupNextNavigation';

vi.mock('next/navigation', () => ({
  useRouter:       () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
  useParams:       () => mockUseParams(),
  usePathname:     () => mockUsePathname(),
  notFound:        mockNotFound,
}));

beforeEach(() => resetNavigationMocks());
```

Opt-in per file (not in Vitest `setupFiles`) — same model as the storage shim.

---

## Caller Invariants

1. `Routes.calendar` is the string literal `'/'`.
2. `Routes.diary(date)` always returns a string starting with `'/diary/'` and ending with the `date` argument unchanged.
3. `Routes.list` is the string literal `'/list'`.
4. `Routes.listWithFilter({})` returns exactly `'/list'` (no trailing `?`).
5. `Routes.listWithFilter(params)` encodes via `URLSearchParams` (correct percent-encoding); `month` always precedes `sort`.
6. `Routes.chat` is `'/chat'`.
7. `Routes.stats` is `'/stats'`.
8. No REQ-006 page file contains `"use client"`. Client Components belong to consuming screen REQs.
9. `mockRouter` is the same object reference returned by `mockUseRouter()` — tests may spy on `mockRouter.push` etc. directly.
10. `resetNavigationMocks()` is idempotent; safe in any `beforeEach`.

---

## Error Contract Summary

| Trigger | Mechanism | Result |
|---|---|---|
| `date` path segment fails `/^\d{4}-\d{2}-\d{2}$/` | `notFound()` inside `DiaryPage` | 404 — renders `not-found.tsx` |
| Any URL not matching the 5 routes | App Router fallthrough | 404 — renders `not-found.tsx` |
| Invalid `month`/`sort` query values on `/list` | No server-side validation in shell; deferred to REQ-013 | 200 (shell renders; REQ-013 handles bad values) |

---

## Out of Scope

- Intercepting routes (`@(.)diary/[date]`) and parallel routes.
- Modal routes — local React state only; no URL segment allocated.
- Dynamic route params beyond `[date]`.
- Scroll restoration and history-state persistence — owned by each screen REQ.
- Semantic date validation — REQ-009.
- Deep-link sharing and PWA routing — v2.
- Any backend, database, or auth contract.

---

## Verdict
PASS
