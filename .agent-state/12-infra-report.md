# Infra Review Report — REQ-009

## Summary

REQ-009 adds the diary editor screen at `/diary/[date]`. The change is a pure frontend SPA addition: new React components, shared hooks, unit tests, and one new Playwright E2E spec. No environment variables, CI workflows, Docker images, backend processes, cloud resources, or secret-handling code were added or modified. All infra-relevant checklists are not applicable to this diff.

## Scope

- `src/app/diary/[date]/page.tsx` (modified)
- `src/app/diary/[date]/_components/` (new, 5 files)
- `src/lib/hooks/` (new, 2 files)
- `src/design-system/useDialogControl.ts` (modified)
- `e2e/editor.spec.ts` (new)
- `e2e/_helpers/seedDiaries.ts` (new)

## Environment / Config Changes

None. No `.env*` files were modified. The only `.env*` file in the repo is `.env.local.example`, which was not touched. The new source files contain zero references to `process.env.*` or `NEXT_PUBLIC_*`. The existing `OPENAI_API_KEY` placeholder in `.env.local.example` is unchanged and irrelevant to this REQ (OpenAI integration is REQ-017).

## Deployment Impact

None material. The new route `/diary/[date]` is a Next.js dynamic segment already declared in the repo's route tree via the pre-existing `src/app/diary/[date]/page.tsx` stub. REQ-009 replaces the stub body — the URL contract does not change. The Next.js build output for this segment is 5.68 kB (confirmed in implementation report). No new API routes, edge functions, or server-side data fetching were added. All data access remains `localStorage` via `readDiaries()` / `upsertDiary()` / `removeDiary()` inside client-side `useEffect`.

`package.json` was not modified. No new runtime dependencies were introduced. The Playwright dependency (`@playwright/test ^1.44.0`) was already present; REQ-009 adds a second spec file to the existing `./e2e` test directory without changing the `playwright.config.ts`.

## Rollback Plan

Standard: revert the relevant commits. Because all storage is `localStorage` and no server-side state was introduced, a rollback leaves no orphaned cloud resources or migrated schemas. Users who saved diary entries via the new editor will retain them in localStorage under the existing `ddalkkak:diaries:v1` key; a rollback of the UI does not corrupt or delete that data.

## Observability Notes

No logging, metrics, or tracing infrastructure was added or removed. The app has no observability layer at this stage (consistent with pre-existing state). The Playwright config sets `trace: 'on-first-retry'`, which produces Playwright trace archives locally on test failures. This is unchanged from the existing config.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. The E2E spec `editor.spec.ts` uses `page.waitForTimeout(1500)` to wait for the 1-second autosave debounce. This is a fixed sleep that will silently pass even if the autosave fires late or never. A more reliable pattern is `page.waitForFunction(() => localStorage.getItem('ddalkkak:diaries:v1') !== null)` after typing. Low severity for a single-developer MVP, but worth fixing before any CI pipeline is added.

2. The `seedDiariesScript` helper in `e2e/_helpers/seedDiaries.ts` uses `new Function(...)` to build the browser-side init script. Works correctly with Playwright's `addInitScript`, but static analysis tools that flag `new Function` (equivalent to `eval`) may generate noise. The conventional pattern is an arrow function with `json` closed over via `JSON.stringify` and passed as an `arg` parameter to `page.addInitScript(fn, arg)`. Not a security issue in this context, but worth noting for consistency.

3. Playwright browser binaries must be present for `npm run test:e2e` to succeed. The `test:e2e:install` script (`playwright install chromium`) is already documented in `package.json`. If a CI pipeline is added in the future, that install step must precede the test run. No action required now.

## Verdict
PASS
