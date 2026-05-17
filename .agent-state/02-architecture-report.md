# Architecture Report — REQ-006

## Summary

REQ-006 implements the routing shell for 딸깍일기: five App Router page files plus `not-found.tsx` and a type-safe `Routes` helper. Repository is Next.js 15.5.18 / React 19. No routing library beyond `next/navigation` is present or needed. The existing `src/app/page.tsx` placeholder is the direct model for all new placeholders. `src/lib/storage/` establishes the module-per-responsibility pattern that `src/lib/navigation/routes.ts` must follow. No blocking gaps.

---

## Frontend Findings

**Existing App Router structure:**
- `src/app/layout.tsx` — root layout, Server Component. Wraps every route in `<div className="mx-auto min-h-dvh max-w-[420px] bg-cream">`. Single shared layout; no per-route layouts needed.
- `src/app/page.tsx` — placeholder: `<main className="px-6 py-8 text-charcoal">` with `<h1>` and `<p className="mt-2 text-meta">`. Canonical tone for all new placeholders.

**Routes to create:**
```
src/app/
  page.tsx                  ← exists; REQ-006 may keep as-is
  not-found.tsx             ← new; Korean 404
  diary/
    [date]/
      page.tsx              ← new; dynamic, async Server Component
  list/
    page.tsx                ← new; placeholder
  chat/
    page.tsx                ← new; placeholder
  stats/
    page.tsx                ← new; placeholder
```

**`/diary/[date]` dynamic segment:** Next.js 15 types `params` as `Promise<{ date: string }>` — must be `await`-ed in async Server Components. Page should: be `async`, await `params`, regex-check `^\d{4}-\d{2}-\d{2}$`, call `notFound()` on mismatch. Calendar-date semantic validation (Feb 31 etc.) deferred to REQ-009.

**Scroll restoration:** Next.js App Router uses browser native scroll restoration by default. No `experimental.scrollRestoration` flag in `next.config.ts` needed. Shell must NOT introduce `overflow: hidden` on body/container or `window.scrollTo` — would silently break native restoration for later REQs.

**Modals not in history:** `BottomSheet`/`ConfirmDialog`/`PhotoViewer` driven by `useDialogControl` local state (REQ-005). No intercepting routes (`(.)`) or parallel slots (`@modal`).

**`next/link` / `router.push`:** Not needed in REQ-006 shell. Future REQs import `Routes.*`.

**URL search-params discipline:** `/list?month=YYYY-MM&sort=asc|desc` agreed for REQ-013. REQ-006 confirms route exists; no `useSearchParams()` calls in shell.

---

## Backend Findings

Not applicable. localStorage-only MVP. `next.config.ts` intentionally empty; remain so for REQ-006.

---

## Data Model Findings

`DiaryEntry.date` is `string` `YYYY-MM-DD` matching `[date]` segment. Shell regex `^\d{4}-\d{2}-\d{2}$` consistent with storage type.

---

## Test Structure Findings

**Vitest config**: default env `node`, global `setupFiles: src/lib/storage/__tests__/setup.ts`, alias `@` → `src/`.

**React tests**: per-file `// @vitest-environment happy-dom`. Established pattern.

**Mocking `next/navigation`**: no existing mock helper. Any test for a Client Component or async Server Component that calls `useRouter`/`useParams`/`useSearchParams`/`usePathname`/`notFound` needs `vi.mock('next/navigation', ...)` in the test file. **REQ-006 should introduce a shared mock helper** to avoid per-file boilerplate when screens land.

**`notFound()`**: throws a special Next.js error. Tests that exercise the `[date]` guard must mock to avoid uncaught throw.

**Test locations**: design-system tests in `src/design-system/__tests__/`; storage in `src/lib/storage/__tests__/`. Navigation tests follow same pattern: `src/lib/navigation/__tests__/routes.test.ts`. Page-component tests may live in `src/app/__tests__/` (new convention) OR co-located in `__tests__/` adjacent to each page.tsx. Design phase decides.

---

## Tooling and Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm test` | `vitest run` |
| `npm run test:watch` | watch |

Next 15.5.18, React 19.0.0. No React Router / TanStack Router.

---

## Existing Patterns to Reuse

1. **Placeholder shape** — copy `src/app/page.tsx`: `<main className="px-6 py-8 text-charcoal"><h1>...</h1><p className="mt-2 text-meta">REQ-XXX에서 채워집니다.</p></main>`.
2. **Module structure** — `src/lib/navigation/` mirrors `src/lib/storage/`: `routes.ts` (responsibility file), `index.ts` (barrel), `__tests__/`.
3. **`// @vitest-environment happy-dom`** on any test rendering React.
4. **`"use client"` guard** — only on components using browser-only APIs. `routes.ts` is pure data + functions, no directive needed.
5. **`notFound()` from `next/navigation`** — call directly inside the async `[date]` page.

---

## Files Likely to Change

| File | Change |
|---|---|
| `src/app/page.tsx` | Likely no content change (REQ-001 placeholder already matches required tone). |
| `src/app/not-found.tsx` | Create — Korean 404. |
| `src/app/diary/[date]/page.tsx` | Create — async, await params, regex guard, `notFound()` on mismatch. |
| `src/app/list/page.tsx` | Create — placeholder. |
| `src/app/chat/page.tsx` | Create — placeholder. |
| `src/app/stats/page.tsx` | Create — placeholder. |
| `src/lib/navigation/routes.ts` | Create — `Routes` object, ≤ 30 lines. |
| `src/lib/navigation/index.ts` | Create — barrel (if design decides). |
| `src/lib/navigation/__tests__/routes.test.ts` | Create — unit tests for path generators. |
| `vitest.config.ts` | Possibly update if shared `next/navigation` mock helper added. |
| `next.config.ts` | No change. |

---

## Risks

1. **Next.js 15 async `params`.** Sync read (`params.date`) returns `undefined` without TS error in some configs. Must `await params` before destructuring. Known v14→v15 breaking change.
2. **`notFound()` in tests.** Throws internally. Without `vi.mock('next/navigation')`, test crashes with uncaught throw rather than clean assertion failure.
3. **`happy-dom` vs `node` env split.** Easy to forget the per-file directive for page tests.
4. **Tailwind token availability.** New page files under `src/` auto-picked by Tailwind content scan. No config change needed.

---

## Unknowns

1. Shared `vi.mock('next/navigation')` helper in REQ-006 or defer to REQ-007? Recommend introduce now to reduce future boilerplate.
2. Whether `src/lib/navigation/index.ts` barrel is needed immediately. Convention from storage suggests yes; design phase decides.
3. Page-component test file location: `src/app/__tests__/` (centralized) vs co-located. Design phase picks.

---

## Verdict
PASS
