# Infra Review Report — REQ-007

## Summary

REQ-007 introduces Playwright E2E test infrastructure (devDependency, config, 1 spec file) alongside frontend-only calendar screen replacement. No backend, deployment, cloud, or env var changes. Only infra-relevant surface is Playwright toolchain + CI implications + local `.gitignore`.

## Scope

- `package.json`: `@playwright/test ^1.44.0` devDep + `test:e2e` + `test:e2e:install` scripts
- `playwright.config.ts`: new at root; Chromium only; `webServer` block; CI-aware flags
- `vitest.config.ts`: additive `exclude: ['node_modules', 'e2e/**']`
- `e2e/calendar.spec.ts`: first E2E spec
- `src/app/page.tsx`: 138 B placeholder → 2.71 kB client-boundary calendar screen
- `src/app/globals.css`: additive `--color-cell-empty` token

Out of scope (confirmed): Docker, GitHub Actions, Vercel config, Supabase, env vars.

## Environment / Config Changes

- `@playwright/test` in `devDependencies`, NOT `dependencies` — confirmed not in production bundle.
- `OPENAI_API_KEY` in `.env.local.example` unchanged; no `NEXT_PUBLIC_` prefix.
- `playwright.config.ts` `webServer.command = npm run dev` — no secrets, no env vars in command.
- `reuseExistingServer: !process.env.CI` — standard pattern.
- `forbidOnly: !!process.env.CI` — prevents accidentally-committed `test.only` from silently skipping all other tests in CI.
- `retries: process.env.CI ? 1 : 0` — single CI retry on flake.

## Deployment Impact

- `/` route: 138 B → 2.71 kB (client JS for `CalendarScreen`). Expected.
- Other 5 routes (`/chat`, `/list`, `/stats`, `/diary/[date]`, `/_not-found`) unchanged at 141 B.
- No new server-side deps. Route still static from Next.js perspective; all diary reads happen client-side via localStorage.

## Rollback Plan

Playwright is devDep. Revert removes infra footprint entirely: delete `playwright.config.ts`, `e2e/`, remove devDep + scripts from `package.json`, revert `vitest.config.ts` exclusion, restore prior `page.tsx`. No persistent state, no migrations, no cloud resources to unwind.

## Observability Notes

Playwright generates `test-results/` and `playwright-report/` in repo root on every test run. Not currently in `.gitignore` — see suggestions.

`reporter: 'list'` appropriate for local. CI could add `'html'` or `'github'` reporter for artifact upload. Not blocking.

`trace: 'on-first-retry'` — correct: traces only on retry, keeping local fast while preserving diagnostic data on CI failure.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. **Add Playwright artifacts to `.gitignore`** (orchestrator will fix before commit):
   ```
   test-results/
   playwright-report/
   playwright/.cache/
   ```

2. **CI integration step order** (when CI lands):
   ```
   npm ci
   npm run test:e2e:install   # downloads chromium
   npm run build              # build gate before slower E2E
   npm run test:e2e
   ```

3. **`webServer.command`** uses `npm run dev`. Future: switch to `npm run build && npm run start` to test production build, catching `"use client"` / static-generation issues. Low priority.

4. **Cache browser binaries in CI** — `npm run test:e2e:install` downloads ~277 MB Chromium. Use `actions/cache` keyed on Playwright version to avoid per-run download.

5. **`new Date()` in E2E spec** — date-sensitive tests can flake across midnight boundary. Low-risk edge case for local-first MVP.

## Verdict

PASS
