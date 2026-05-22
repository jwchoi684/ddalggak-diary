# Security Review Report — REQ-010

## Summary

REQ-010 adds a purely client-side horizontal date strip to the diary editor. It introduces three new source files (`useHorizontalDatePicker.ts`, `HorizontalDatePicker.tsx`, `DateCell.tsx`), modifies `Editor.tsx` and `EditorBody.tsx`, and adds CSS keyframes and a scrollbar-hiding utility. There is no backend, no network I/O, no authentication or authorization surface, and no new dependencies. The attack surface introduced is minimal and contained entirely to the React component tree.

All ten targeted verification checks pass cleanly. No critical, high, or medium issues were found.

## Scope

- `src/lib/hooks/useHorizontalDatePicker.ts`
- `src/app/diary/[date]/_components/HorizontalDatePicker.tsx`
- `src/app/diary/[date]/_components/DateCell.tsx`
- `src/app/diary/[date]/_components/Editor.tsx`
- `src/app/diary/[date]/_components/EditorBody.tsx`
- `src/app/globals.css`
- `e2e/horizontal-date-picker.spec.ts`
- `package.json` (verified unchanged)
- `src/lib/storage/` (keys.ts, diaries.ts — for localStorage key construction audit)

## Critical Issues

None.

## High Issues

None.

## Medium Issues

None.

## Low Issues

None.

## Commands Run

```
git diff HEAD~1 -- src/app/diary/[date]/_components/ src/lib/hooks/ src/app/globals.css
git diff --name-only HEAD~1
rg -n "dangerouslySetInnerHTML|innerHTML|eval\(|new Function|document\.write" src/app/diary/[date]/_components/ src/lib/hooks/
rg -n "password|secret|token|api_key|private_key|apiKey|AUTH" src/app/diary/[date]/_components/ src/lib/hooks/ e2e/horizontal-date-picker.spec.ts
rg -n "console\." src/app/diary/[date]/_components/ src/lib/hooks/
rg -n "localStorage|sessionStorage" src/app/diary/[date]/_components/ src/lib/hooks/
rg -n "ddalkkak:" src/lib/hooks/useHorizontalDatePicker.ts src/app/diary/[date]/_components/
rg -n "scrollIntoView" src/app/diary/[date]/_components/HorizontalDatePicker.tsx
git diff HEAD -- package.json package-lock.json
```

## Verification Checklist Results

1. **No `dangerouslySetInnerHTML` / `innerHTML` with user content.** Confirmed absent across all new files. All user-supplied diary text is rendered as a React controlled `<textarea>` value — never injected as HTML.

2. **User-typed text rendered only via React text children.** The `<textarea value={text}>` in `EditorBody.tsx` and the diary text field in editor state flow through React's value binding exclusively. `DateCell.tsx` renders day numbers (`dayNumber(date)`) derived from the ISO date string (format `YYYY-MM-DD`), not user-typed content.

3. **No `eval`, `new Function`, code-as-string.** Confirmed absent.

4. **No secrets, tokens, or API keys introduced.** Confirmed absent. No new `.env` references, no hardcoded credentials.

5. **No `console.log` of user content.** Confirmed absent from all new and modified files.

6. **localStorage keys not constructed from user input.** `useHorizontalDatePicker.ts` calls `readDiaries()` from `@/lib/storage`, which uses the hardcoded constant `'ddalkkak:diaries:v1'` (defined in `src/lib/storage/keys.ts`). The `date` string (ISO format, validated by a regex in `page.tsx` before reaching `Editor`) is stored as a field value within the JSON payload, not used to construct any storage key.

7. **ISO date param validated upstream.** `src/app/diary/[date]/page.tsx` calls `notFound()` if the route param does not match `/^\d{4}-\d{2}-\d{2}$/` before instantiating `<Editor date={date} />`. `buildDateRange` in `useHorizontalDatePicker.ts` has its own defensive guard: if `Date.UTC(y, m-1, d)` returns `NaN`, it returns a single-element array rather than crashing. The `toKoreanDateLabel` function in `DateCell.tsx` similarly has a `try/catch` returning the raw date string on any `Intl` failure.

8. **No new dependencies introduced.** `git diff HEAD -- package.json package-lock.json` produced no output. `Intl.DateTimeFormat('ko-KR')` is a built-in browser API, not a third-party library.

9. **`Intl.DateTimeFormat('ko-KR')` is safe.** Used as a pure formatting API on pre-validated date strings. No locale data is loaded from external sources. The `try/catch` wrappers in both `DateCell.tsx` and `EditorBody.tsx` handle any edge-case `Intl` errors gracefully.

10. **`scrollIntoView` scoped to component's own DOM.** `HorizontalDatePicker.tsx` line 33: `container.querySelector('[aria-selected="true"]')` is called on `scrollRef.current`, which is the component's own scroll container `<div>`. The query cannot escape this boundary; no `document.querySelector` or global DOM access is used.

**Additional checks (from standard checklist applied to this feature):**

- **Authentication / Authorization / IDOR / Tenant isolation:** Not applicable. This is a fully local, unauthenticated single-user app using `localStorage`. No server-side data access occurs in this feature.
- **Injection risks:** No SQL, shell, template, or HTML injection surfaces. All date arithmetic uses `Date.UTC` with parsed integers, not string interpolation into any query or template.
- **CSRF-sensitive mutations:** Not applicable. All mutations are `localStorage` writes with no cross-origin requests.
- **SSRF risks:** Not applicable. No outbound HTTP requests.
- **Rate limiting / abuse:** Not applicable to a client-side-only feature.
- **Insecure defaults:** `isOpen` defaults to `false` (strip closed) — correct. `entryMap` is built from the local storage read, not from any external source.
- **Internal error disclosure:** The `catch` blocks in `buildDateRange`, `toKoreanDateLabel`, and `formatDate` all return safe fallback values (the raw date string or an empty array) without surfacing stack traces to the UI.

## Required Fixes

None.

## Accepted Residual Risks

None. The non-blocking observations documented in the code review report (dead Tailwind class `scroll-snap-align-center`, E2E `isoDate()` timezone divergence, `onSaveError` inline arrow stability) are correctness and performance nits with zero security relevance.

## Verdict
PASS
