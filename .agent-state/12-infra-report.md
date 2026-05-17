# Infra Review Report — REQ-004

## Summary

REQ-004 introduces a static data module (`src/design-system/personas.ts`) and a companion test file. Zero infrastructure surface. No deployment, CI/CD, environment, networking, or runtime concerns.

## Scope

Two new files, both pure TypeScript source with no I/O, no network calls, and no side effects beyond in-memory constant initialization. No existing file was modified.

## Environment / Config Changes

`package.json` dependencies unchanged from REQ-003. Current set: `next@15.5.18`, `react@19.0.0`, `react-dom@19.0.0`, `vitest@^2.0.0`, `happy-dom@^20.9.0`, `@testing-library/react@^16.3.2`, `@tailwindcss/postcss@^4.0.0`, `tailwindcss@^4.0.0`, TypeScript, ESLint.

No env vars added or removed. `.env.local.example` remains with `OPENAI_API_KEY` (commented out) and two commented Supabase fields.

## Deployment Impact

None. The two new files are tree-shaken at build time (`npm run build` produced 4/4 static pages, exit 0). No new network-reachable surface in production bundle.

## Rollback Plan

Not applicable. Reverting = delete two source files. No migration, no external coordination, no feature flag.

## Observability Notes

No logging, metrics, or tracing changes. Only observable runtime behavior is an `Error` throw from `getPersona()` on unknown id; callers (REQ-016/017) should catch and observe at the AI chat layer.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. **REQ-017 infra gate**: when REQ-017 lands, verify `OPENAI_API_KEY` is never exposed via `NEXT_PUBLIC_` prefix and that all LLM calls route through a server-side proxy (Next.js Route Handler or Vercel Function). First genuine infra surface in this project.
2. **postcss advisory**: the moderate `postcss < 8.5.10` advisory (GHSA-qx2v-qp2m-jg93) remains outstanding. Address in a dedicated dependency-hygiene cycle before REQ-017 to clean the audit baseline.
3. **Vitest CJS deprecation warning**: cosmetic but will appear in any future CI log. Adding `"type": "module"` to `package.json` or upgrading to Vitest 3.x would eliminate it before CI is wired up.

## Verdict

PASS — not applicable. REQ-004 touches no infra surface.
