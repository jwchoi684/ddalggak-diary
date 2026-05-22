# Infra Review Report — REQ-011

## Summary

REQ-011 is a pure client-side photo attachment feature (FileReader, localStorage base64, no backend). The only infrastructure-touching change is a fix-cycle edit to `playwright.config.ts`. All other infra surfaces are untouched.

## Scope

The following infra surfaces were checked:

- `package.json` / `package-lock.json` — dependency manifest
- `.env*` files — environment variable configuration
- `.github/` — CI/CD workflows (directory does not exist in this repo)
- `playwright.config.ts` — E2E test runner configuration
- `next.config*` — Next.js build/routing configuration
- Docker / Compose files — not present in repo

## Environment / Config Changes

None. No `.env` files were added or modified. No environment variables are introduced, removed, or renamed by REQ-011. The existing `OPENAI_API_KEY` path in `.env.local.example` is unchanged.

## Deployment Impact

None. REQ-011 adds no server routes, no API handlers, no build-time plugins, and no new npm dependencies. The Next.js routing tree is unchanged. Build output is identical in character — no new pages, no changed `next.config.ts`.

The single config change is in `playwright.config.ts`, which is a test-time file and has no effect on the production deployment artifact.

## `playwright.config.ts` Change Analysis

Changes introduced:

1. Port 3000 -> 3001 across `baseURL`, `webServer.url`, and `webServer.command` (`next dev --port 3001`). Rationale (VS Code extension host conflict on port 3000) is valid and well-commented. Port 3001 is unambiguous and does not collide with any other declared service.

2. `workers: 1` and `fullyParallel: false` — prevent parallel cold-start races against Next.js route compilation. Conservative and appropriate for a single-machine dev environment.

3. `expect.timeout: 15_000` and `navigationTimeout: 15_000` — accommodate Next.js cold-start compile time. Standard mitigation.

4. `stdout: 'pipe'` + `wait: { stdout: /Ready in/ }` — waits for the Next.js "Ready in" log line before releasing the webServer gate. The code-reviewer flagged this as relying on an undocumented API (NB-6). Verification: Playwright 1.60.0 is installed; `defineConfig` accepts the `wait` property without error. The `wait.stdout` key is present in `@playwright/test` 1.50+ internals (introduced as part of the webServer stability improvements) and is accepted by the schema validator at runtime. The risk is that the exact log string "Ready in" is Next.js-internal and could change across Next.js versions, causing the E2E suite to hang until `timeout: 120_000` expires before falling through. This is not a blocking deployment risk — it only affects local E2E runs and CI E2E runs; it does not affect the production build or runtime.

## Rollback Plan

No deployment artifact is changed. Rolling back this feature requires reverting the source files listed in the implementation report. `playwright.config.ts` can independently be reverted to port 3000 with the URL-based readiness check (`url: 'http://localhost:3000'`) if the `wait.stdout` pattern causes CI hangs.

## Observability Notes

No logging, metrics, or tracing changes. The feature writes only to `localStorage`; no server-side observability surface is touched.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. The `wait: { stdout: /Ready in/ }` pattern depends on a Next.js log string that is not part of its public API. If Next.js changes that string in a future upgrade, the E2E suite will time out (after 120 s) rather than fail fast. A more robust fallback is to remove `wait` and rely solely on Playwright's URL-based health poll combined with the existing `timeout: 120_000`. The port change alone resolves the VS Code conflict; the `wait` optimization is additive.

2. The `webServer.command` now calls `next` directly rather than via `npm run dev`. Ensure the `next` binary is resolvable in CI PATH (it is, given `next` is a project dependency resolved through `node_modules/.bin`), but this is worth noting if a CI image does not install dev dependencies.

## Verdict
PASS
