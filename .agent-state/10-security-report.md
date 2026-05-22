# Security Review Report — REQ-009

## Summary

REQ-009 adds a client-side diary editor at route `/diary/[date]`. The feature is purely client-side: no backend, no network calls, no authentication layer. All persistence is `localStorage` under `ddalkkak:diaries:v1`. The attack surface is extremely narrow. No critical or high issues were found. One low-severity finding is noted regarding an E2E test helper using `new Function`, and one informational note regarding missing runtime type validation of stored data.

## Scope

Files reviewed:

- `src/app/diary/[date]/page.tsx`
- `src/app/diary/[date]/_components/Editor.tsx`
- `src/app/diary/[date]/_components/EditorHeader.tsx`
- `src/app/diary/[date]/_components/EditorBody.tsx`
- `src/app/diary/[date]/_components/EditorToolbar.tsx`
- `src/app/diary/[date]/_components/EditorMoreMenu.tsx`
- `src/lib/hooks/useAutosave.ts`
- `src/lib/hooks/useEditorState.ts`
- `src/design-system/useDialogControl.ts`
- `src/lib/storage/diaries.ts`, `ssr.ts`, `keys.ts`, `types.ts`
- `e2e/editor.spec.ts`
- `e2e/_helpers/seedDiaries.ts`
- Agent state documents: 01, 03, 04, 05, 07, 08, 09

Commands run:

```bash
git diff HEAD~1 --name-only
rg "dangerouslySetInnerHTML|innerHTML|document.write|outerHTML" src/ e2e/
rg "eval\(|new Function|Function\(|setTimeout\(.*string|setInterval\(.*string" src/ e2e/
rg "password|secret|token|api_key|private_key|apiKey|API_KEY|SECRET" src/ e2e/
rg "console\.log|console\.warn|console\.error|console\.dir|console\.info" src/app/diary src/lib/hooks
rg "fetch\(|XMLHttpRequest|axios|openai|gpt" src/app/diary src/lib/hooks
rg "href|src=" src/app/diary/[date]/_components/ src/lib/hooks/
rg "router\.push" src/app/diary/[date]/_components/Editor.tsx
rg "new Function" e2e/ src/
rg "window\.(location|open)|document\.(location|write|cookie)" src/app/diary src/lib/hooks
rg "\.env|process\.env|NEXT_PUBLIC" src/app/diary src/lib/hooks
rg "parsed as DiaryEntry" src/lib/storage/
npm audit --audit-level=high
```

## Critical Issues

None.

## High Issues

None.

## Medium Issues

None.

## Low Issues

### LOW-1: `new Function` in E2E test helper

File: `e2e/_helpers/seedDiaries.ts` line 17

`seedDiariesScript` uses `new Function(...)` to construct a browser-executable string from a hardcoded localStorage key constant and a `JSON.stringify(entries)` value. The entries originate from the test fixture type `DiaryEntry[]` — they are controlled entirely by test authors and never reach production code. The function is only called by `page.addInitScript()` in Playwright tests, never at application runtime.

This is not exploitable in production. However, `new Function` as a pattern is worth flagging for completeness:

- The localStorage key (`DIARIES_KEY`) is a module-level constant, not user-supplied.
- The entries payload is `JSON.stringify`-escaped before interpolation, so no user-controlled string can escape the JSON encoding boundary.
- The function runs inside a Playwright-controlled browser context, not in production.

A cleaner alternative that avoids `new Function` entirely is to use `page.evaluate` with structured data passing instead:

```ts
// Safer pattern — no code-as-string, uses Playwright's structured data bridge
await page.addInitScript(
  ({ key, json }) => localStorage.setItem(key, json),
  { key: DIARIES_KEY, json: JSON.stringify(entries) }
);
```

Severity: Low. Not exploitable. Deferred to a future cleanup if the codebase adopts a lint rule against `new Function`.

### LOW-2: Unchecked type assertion on `localStorage` array members

File: `src/lib/storage/diaries.ts` lines 18–19

```ts
const parsed: unknown = JSON.parse(raw);
if (!Array.isArray(parsed)) return [];
return parsed as DiaryEntry[];
```

The check confirms `parsed` is an array but does not validate individual element shapes. A maliciously crafted or corrupted `localStorage` value could inject objects with unexpected field types (e.g., `mood` set to an arbitrary string outside the `MoodId` union). These would propagate into editor state without runtime rejection.

In the current threat model this is acceptable: the app is a personal single-user diary with no cross-origin `localStorage` access vectors and no server trust boundary. The `DiaryEntry.mood` field is only used to look up display metadata from a static `MOODS` array; an unrecognised mood id would render as an absent icon or undefined lookup, not as XSS or privilege escalation.

This would be worth revisiting if the app adds any server-side parsing, import/export, or sharing features.

Severity: Low. Informational for current MVP scope.

## Commands Run

```
rg "dangerouslySetInnerHTML|innerHTML|document.write|outerHTML" src/ e2e/   → NONE FOUND
rg "eval\(|new Function|..." src/ e2e/                                       → 1 result: e2e/_helpers/seedDiaries.ts:17
rg "password|secret|token|api_key|..." src/ e2e/                             → NONE (only innocuous token in comment)
rg "console\.log|console\.warn|..." src/app/diary src/lib/hooks              → NONE FOUND
rg "fetch\(|XMLHttpRequest|axios|openai|gpt" src/app/diary src/lib/hooks     → NONE FOUND
rg "href|src=" src/app/diary/[date]/_components/                             → NONE FOUND
rg "window\.(location|open)|document\.(location|write|cookie)" ...           → NONE FOUND
rg ".env|process.env|NEXT_PUBLIC" src/app/diary src/lib/hooks                → NONE FOUND
npm audit --audit-level=high                                                  → 0 high/critical; 7 moderate (pre-existing vite/postcss, build-tooling only)
```

## Checklist Results

| # | Check | Result |
|---|---|---|
| 1 | Authentication checks | N/A — no auth layer |
| 2 | Authorization checks | N/A — no auth layer |
| 3 | Resource ownership checks | N/A — single-user local storage |
| 4 | IDOR risks | N/A — no server, no user identity |
| 5 | Tenant/user isolation | N/A — single-user app |
| 6 | Input validation | PASS — `date` param validated with `/^\d{4}-\d{2}-\d{2}$/` regex in server component before `Editor` receives it; `maxLength={5000}` on textarea; `MoodId` narrowed to 10-member union |
| 7 | Injection risks | PASS — no `dangerouslySetInnerHTML`, no `innerHTML`, no `document.write`, no `eval` in production code |
| 8 | XSS and unsafe rendering | PASS — user-typed body text flows through React's controlled `<textarea value={text}>` and is never rendered as HTML |
| 9 | CSRF-sensitive mutations | N/A — no HTTP mutations; localStorage writes have no CSRF surface |
| 10 | Secret leakage | PASS — no API keys, tokens, or credentials introduced |
| 11 | Sensitive data logging | PASS — no `console.log` calls found in editor or hooks code |
| 12 | Unsafe file upload / path traversal | N/A — gallery is a noop stub; no file system access |
| 13 | SSRF risks | N/A — no server-side network calls |
| 14 | Dependency vulnerabilities | PASS for scope — 7 moderate vulns in `vite`/`postcss` (pre-existing, build-time only, no production surface); 0 high/critical |
| 15 | Internal error disclosure | N/A — no server boundary |
| 16 | Rate limiting / abuse | N/A — no network requests; autosave is client-side debounced |
| 17 | Insecure defaults | PASS — `textAlign` defaults to `'left'`; dialog listeners default-off until `open=true` |
| 18 | Permission changes | PASS — no new file permissions, no new API routes, no new environment variables |
| 19 | `useDialogControl` listener lifecycle | PASS — cancel listener is attached only when `open=true` and removed in effect cleanup; `onCloseRef` pattern prevents stale-closure capture. No leaked listeners. |

## Required Fixes

None.

## Accepted Residual Risks

1. **LOW-1** (`new Function` in E2E helper) — test-only, not production code, no exploitable path. Accepted.
2. **LOW-2** (unchecked `DiaryEntry[]` type assertion on storage read) — no server boundary, no cross-origin write vector, no rendering of arbitrary HTML from corrupt data. Acceptable for single-user localStorage MVP; revisit before any export/import or cloud-sync feature.

## Verdict
PASS
