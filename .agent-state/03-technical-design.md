# Technical Design — REQ-006

## Goal

Establish the routing shell for 딸깍일기: five Next.js App Router page files, a Korean `not-found.tsx`, a type-safe `Routes` helper module, and a shared `vi.mock('next/navigation')` test helper. No real screen content is produced — each page renders a placeholder. All subsequent screen REQs (007–018) depend on this shell as their routing foundation.

---

## Resolved Unknowns

**1 — Shared `vi.mock('next/navigation')` helper: introduce now.**
At `src/lib/navigation/__tests__/setupNextNavigation.ts`. Rationale: REQ-007 (calendar) and REQ-009 (editor) both render Client Components calling `useRouter`/`useSearchParams`. Adding the helper now costs ~40 lines and saves N-REQ files from duplicating. Pattern mirrors `src/lib/storage/__tests__/setup.ts`.

**2 — `src/lib/navigation/index.ts` barrel: yes.**
Mirrors `src/lib/storage/index.ts` (REQ-002). Callers write `import { Routes } from '@/lib/navigation'`. Single source of truth.

**3 — Page-component test location: centralized `src/app/__tests__/`.**
App Router pages live at fixed paths. Co-locating tests inside `diary/[date]/` mixes routing segments with tests. Centralized keeps `src/app/` purely routing.

---

## File Layout (with line budgets)

| File | Status | Budget |
|---|---|---|
| `src/app/page.tsx` | Unchanged (REQ-001 placeholder canonical) | 8 lines |
| `src/app/not-found.tsx` | Create — Korean 404 Server Component | ≤ 20 lines |
| `src/app/diary/[date]/page.tsx` | Create — async Server Component, regex guard | ≤ 25 lines |
| `src/app/list/page.tsx` | Create — placeholder | ≤ 10 lines |
| `src/app/chat/page.tsx` | Create — placeholder | ≤ 10 lines |
| `src/app/stats/page.tsx` | Create — placeholder | ≤ 10 lines |
| `src/lib/navigation/routes.ts` | Create — `Routes` object + `listWithFilter` | ≤ 30 lines |
| `src/lib/navigation/index.ts` | Create — barrel | ≤ 10 lines |
| `src/lib/navigation/__tests__/setupNextNavigation.ts` | Create — shared mock helper | ≤ 40 lines |
| `src/lib/navigation/__tests__/routes.test.ts` | Create — unit tests | ≤ 50 lines |
| `src/app/__tests__/diary-date-page.test.tsx` | Create — date guard test | ≤ 50 lines |
| `src/app/__tests__/not-found.test.tsx` | Create (recommended) | ≤ 20 lines |

---

## Routes API (exact shape)

```ts
// src/lib/navigation/routes.ts

export const Routes = {
  calendar: '/' as const,
  diary: (date: string): string => `/diary/${date}`,
  list: '/list' as const,
  listWithFilter: (params: { month?: string; sort?: 'asc' | 'desc' }): string => {
    const sp = new URLSearchParams();
    if (params.month) sp.set('month', params.month);
    if (params.sort) sp.set('sort', params.sort);
    const qs = sp.toString();
    return qs ? `/list?${qs}` : '/list';
  },
  chat: '/chat' as const,
  stats: '/stats' as const,
} as const;
```

Rationale:
- `as const` on string literals: preserves literal types for caller narrowing.
- `diary` as plain function returning `string` — dynamic segment unknown at compile time.
- `URLSearchParams` for query construction — correct percent-encoding, deterministic order.
- No external path library — over-engineering for 5 routes.

---

## `/diary/[date]` Page Skeleton

```tsx
// src/app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryPage({ params }: PageProps) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  return (
    <main className="px-6 py-8 text-charcoal">
      <h1 className="text-3xl">{date} 일기</h1>
      <p className="mt-2 text-meta">REQ-009에서 채워집니다.</p>
    </main>
  );
}
```

Next.js 15 types `params` as `Promise<{ date: string }>`. Sync read without `await` yields `undefined` in some build modes. Regex covers format only; semantic check (Feb 31) deferred to REQ-009.

---

## `not-found.tsx` Skeleton

```tsx
// src/app/not-found.tsx
export default function NotFound() {
  return (
    <main className="px-6 py-8 text-charcoal">
      <h1 className="text-3xl">찾을 수 없는 페이지입니다.</h1>
      <p className="mt-2 text-meta">
        주소를 확인하거나{' '}
        <a href="/" className="underline">
          캘린더로 돌아가세요
        </a>
        .
      </p>
    </main>
  );
}
```

Bare `<a href="/">` rather than `next/link` — fallback screen, not a primary navigation surface. Server Component; no `"use client"`.

---

## Shared `next/navigation` Mock Helper

```ts
// src/lib/navigation/__tests__/setupNextNavigation.ts
import { vi } from 'vitest';

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  forward: vi.fn(),
};

export const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

export function mockUseRouter() { return mockRouter; }
export function mockUseSearchParams() { return new URLSearchParams(); }
export function mockUseParams(): Record<string, string> { return {}; }
export function mockUsePathname(): string { return '/'; }

export function resetNavigationMocks() {
  mockRouter.push.mockReset();
  mockRouter.replace.mockReset();
  mockRouter.back.mockReset();
  mockRouter.prefetch.mockReset();
  mockNotFound.mockReset().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
}
```

Per-file usage:
```ts
vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
  useParams: () => mockUseParams(),
  usePathname: () => mockUsePathname(),
  notFound: mockNotFound,
}));
beforeEach(() => resetNavigationMocks());
```

Opt-in per test file (not auto-loaded by Vitest `setupFiles`) — same model as the storage shim.

---

## Test Design Sketch (handover to Phase 8)

**`routes.test.ts`** (node env, ≤ 50 lines):
- Each static path constant equals expected literal.
- `Routes.diary('2026-05-17')` → `'/diary/2026-05-17'`
- `Routes.listWithFilter({ month: '2026-04', sort: 'desc' })` → `'/list?month=2026-04&sort=desc'`
- `Routes.listWithFilter({})` → `'/list'` (no trailing `?`)
- `Routes.listWithFilter({ sort: 'asc' })` → `'/list?sort=asc'`

**`diary-date-page.test.tsx`** (happy-dom env, ≤ 50 lines):
- Strategy: render async Server Component's returned JSX directly.
- Valid date `'2026-05-17'`: heading contains the date.
- Invalid `'not-a-date'`: `mockNotFound` called, error caught.
- `'2026-13-01'`: passes regex, renders (semantic check is REQ-009's).

**`not-found.test.tsx`** (happy-dom env, ≤ 20 lines):
- Renders Korean message.
- Anchor points to `'/'`.

---

## Implementation Order

1. `src/lib/navigation/routes.ts`
2. `src/lib/navigation/index.ts` (barrel)
3. `src/lib/navigation/__tests__/setupNextNavigation.ts`
4. `src/lib/navigation/__tests__/routes.test.ts`
5. `src/app/not-found.tsx`
6. `src/app/diary/[date]/page.tsx`
7. `src/app/{list,chat,stats}/page.tsx` (parallel)
8. `src/app/__tests__/diary-date-page.test.tsx`
9. `src/app/__tests__/not-found.test.tsx`
10. `npm run typecheck && npm run lint && npm test && npm run build`

---

## Backend / Data / Infra Design

None.

---

## Backward Compatibility

`src/app/page.tsx` unchanged. No existing import paths move. All changes purely additive.

---

## Performance Considerations

All page files are Server Components — produce static HTML, no client JS bundle growth. `routes.ts` is tiny and tree-shakes if unused.

---

## Risks and Tradeoffs

| Risk | Mitigation |
|---|---|
| Next.js 15 `params` is `Promise`. Sync read silently yields `undefined`. | Typed as `Promise<...>` and `await`-ed. TypeScript catches if a future caller reads sync. |
| `notFound()` throws internally; test without mock crashes. | Shared helper mocks it to a catchable `Error`. |
| `happy-dom` env per-file directive easy to forget. | Test files carry `// @vitest-environment happy-dom`. Omitting is visible at run. |
| `URLSearchParams` insertion order. | Params set in fixed order (`month` then `sort`) for deterministic test output. |

---

## Open Questions

None blocking. All 3 architecture unknowns resolved.

---

## Verdict
PASS
