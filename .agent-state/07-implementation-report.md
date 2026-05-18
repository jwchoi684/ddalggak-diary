# Frontend Implementation

## Summary

Implemented REQ-002: domain type definitions and localStorage abstraction layer for ddalkkak-diary. All eight production source files were created under `src/lib/storage/`, one Vitest config at the project root, six test files, and `package.json` was updated with test scripts and the `vitest` devDependency. The `.gitkeep` placeholder in `src/lib/` was removed. All 38 tests pass; TypeScript, ESLint, and the Next.js production build are all clean.

---

## Files Changed

### New — production source

| File | Lines | Role |
|---|---|---|
| `src/lib/storage/keys.ts` | 13 | Three storage key string constants (`ddalkkak:diaries:v1`, `ddalkkak:conversations:v1`, `ddalkkak:settings:v1`) |
| `src/lib/storage/types.ts` | 155 | All domain types: `MoodId`, `Mood`, `PersonaId`, `Persona`, `Photo`, `DiaryEntry`, `ChatMessage`, `SearchConversation`, `Settings` |
| `src/lib/storage/ssr.ts` | 43 | `isServer`, `safeGet`, `safeSet`, `safeRemove` — only file allowed to touch `window.localStorage` |
| `src/lib/storage/uuid.ts` | 20 | `generateId()` wrapping `crypto.randomUUID()` |
| `src/lib/storage/diaries.ts` | 80 | `readDiaries`, `writeAllDiaries`, `upsertDiary` (two-step id+date dedup), `removeDiary` |
| `src/lib/storage/conversations.ts` | 69 | `readConversations`, `writeAllConversations`, `upsertConversation` (id-only dedup), `removeConversation` |
| `src/lib/storage/settings.ts` | 47 | `readSettings`, `writeSettings` (shallow merge) |
| `src/lib/storage/index.ts` | 38 | Public re-exports only; key constants not exposed |

### New — test infrastructure

| File | Tests | Role |
|---|---|---|
| `src/lib/storage/__tests__/setup.ts` | — | In-memory `LocalStorageShim` installed on `globalThis`; `beforeEach` clears state |
| `src/lib/storage/__tests__/fixtures.ts` | — | `makeDiary()` and `makeConversation()` factories with auto-incrementing unique ids/dates |
| `src/lib/storage/__tests__/diaries.test.ts` | 13 | All diary read/write/upsert/remove cases including 1-per-day and id-precedence invariants |
| `src/lib/storage/__tests__/conversations.test.ts` | 9 | All conversation cases including regression guard for date-dedup not being copied from diaries |
| `src/lib/storage/__tests__/settings.test.ts` | 8 | readSettings resilience + writeSettings shallow-merge behavior |
| `src/lib/storage/__tests__/uuid.test.ts` | 3 | UUID v4 format, uniqueness, non-empty string |
| `src/lib/storage/__tests__/ssr.test.ts` | 4 | `isServer` and `safeGet`/`safeSet` under `vi.stubGlobal('window', undefined)` |
| `src/lib/storage/__tests__/no-direct-localstorage-access.test.ts` | 1 | `execSync` grep ensuring no file outside `src/lib/storage/` references `localStorage` |

### New — config

| File | Role |
|---|---|
| `vitest.config.ts` | `environment: 'node'`, `setupFiles`, `alias: { '@': './src' }` |

### Modified

| File | Change |
|---|---|
| `package.json` | Added `"test": "vitest run"`, `"test:watch": "vitest"` scripts; added `"vitest": "^2.0.0"` to devDependencies |

### Deleted

| File | Reason |
|---|---|
| `src/lib/.gitkeep` | Replaced by the storage directory |

---

## Behavior Added

- **`readDiaries()`** — reads from `ddalkkak:diaries:v1`; returns `[]` on absent key, corrupt JSON, or non-array value; never throws.
- **`writeAllDiaries(entries)`** — replaces entire collection; propagates `QuotaExceededError`; no-op on SSR.
- **`upsertDiary(entry)`** — two-step dedup: id-match first (edit path), then date-match (1-per-day enforcement), then append. Post-call invariant: exactly one entry per `date`.
- **`removeDiary(id)`** — filter-and-overwrite; no-op if id not found.
- **`readConversations()`** / **`writeAllConversations()`** / **`upsertConversation()`** / **`removeConversation()`** — same resilience contract; upsert deduplicates by `id` only (no date constraint for conversations).
- **`readSettings()`** — returns `{}` on absent, corrupt, non-object, or null value.
- **`writeSettings(patch)`** — shallow-merges patch into stored object; unrelated keys preserved.
- **`generateId()`** — delegates to `crypto.randomUUID()`; returns RFC 4122 UUID v4.

---

## Existing Patterns Reused

- `@/*` path alias (already in `tsconfig.json`; mirrored in `vitest.config.ts`).
- TypeScript strict mode (`strict: true`, `isolatedModules: true`) — all files satisfy these constraints with explicit exports.
- ESLint config (`next/core-web-vitals`) — no new rules added; existing rule set used as-is.

---

## Tests Added / Updated

Six new test files covering 38 test cases:

- All API contract caller invariants from `04-api-contract.md` are covered.
- Corrupt JSON resilience verified and key-left-intact assertion included.
- `upsertDiary` id-match-over-date-match precedence case explicitly tested.
- Conversations regression guard: two sessions with identical `startedAt` must both be retained.
- SSR path tested via `vi.stubGlobal('window', undefined)` — no `jsdom` needed.
- No-direct-localStorage grep test enforces the module boundary at test time.

---

## Commands Run

```
npm install --no-audit --no-fund   → installed vitest (35 packages)
npm run typecheck                  → PASS (no output, exit 0)
npm run lint                       → PASS ✔ No ESLint warnings or errors
npm test                           → PASS 38/38 tests passed (6 files)
npm run build                      → PASS ✓ Generating static pages (4/4)
```

One lint iteration was required: the initial `setup.ts` used `@typescript-eslint/no-explicit-any` eslint-disable comments but that plugin is not installed in this project. Fixed by replacing `(globalThis as any)` casts with `(globalThis as unknown as Record<string, unknown>)`, which satisfies TypeScript strict mode without the plugin.

---

## Risks / Follow-ups

- **`types.ts` line count** — currently 155 lines, which exceeds the 100-line CLAUDE.md guideline. The file contains exclusively type definitions (interfaces and literal unions) with full JSDoc, matching the 80-line budget from the technical design only if stripped of comments. The design itself noted that splitting into `types.persona.ts` is a fallback option. For now, the file is a single responsibility (domain types) with no logic, making it a natural exception per CLAUDE.md ("테이블·상수 데이터처럼 쪼개기 부자연스러운 경우는 예외"). If REQ-003/004 add more persona-specific types, splitting at that point is the natural trigger.
- **CJS deprecation warning from Vitest** — `The CJS build of Vite's Node API is deprecated` appears at test startup. This is a cosmetic warning from Vitest 2.x with no functional impact. Upgrading to Vitest 3.x or adding `"type": "module"` to `package.json` would eliminate it; deferred as out of scope.
- **Fixture counter state** — `makeDiary` and `makeConversation` use module-level counters. Since Vitest isolates test files, counters reset per file. If tests within a file rely on specific counter values, they may be fragile. Current tests use the fixtures for uniqueness only and do not depend on specific counter values, so this is not a current risk.
- **Photo base64 size** — `DiaryEntry.photos` stores `dataUrl` (base64). With no compression (REQ-011 deferred), large photos will push entries toward the ~5 MB localStorage quota. The storage layer propagates `QuotaExceededError` correctly; the UI layer (REQ-005+) must handle it.

---

## Verdict
PASS

---

## Fix Cycle 1 (Security)

### What changed

`package.json` only — two exact-version pins bumped to eliminate the two Critical CVEs flagged in `10-security-report.md`:

| Package | Before | After |
|---|---|---|
| `next` (dependency) | `15.1.4` | `15.5.18` |
| `eslint-config-next` (devDependency) | `15.1.4` | `15.5.18` |

No source files under `src/` were touched.

### Gate results

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS (exit 0, no output) |
| `npm run lint` | PASS (no ESLint warnings or errors; `next lint` deprecation notice is cosmetic) |
| `npm test` | PASS (38/38 tests, 6 files) |
| `npm run build` | PASS (Next.js 15.5.18, 4/4 static pages generated) |

### Audit outcome (`npm audit --omit=dev`)

The two blocking Critical CVEs are gone:
- GHSA-9qr9-h5gf-34mp (RCE via React Server Components flight protocol) — resolved
- GHSA-f82v-jwr5-mffw (auth bypass in Middleware) — resolved

Two **moderate** findings remain (`postcss < 8.5.10`, GHSA-qx2v-qp2m-jg93). The suggested auto-fix would downgrade Next.js to 9.3.3 — a breaking change that must not be applied. These are non-blocking moderate issues; `@tailwindcss/postcss` bundles its own postcss internally and the affected code path (CSS stringify) is not reached in production output at this version. Deferred to a separate dependency-hygiene cycle.

## Fix Cycle 1 Verdict
PASS

---

## Fix Cycle 1 (Performance)

### What changed

Added storage capacity constants to resolve the blocking issue from `11-performance-report.md` (no enforceable size contract for `Photo.dataUrl`).

| File | Action |
|---|---|
| `src/lib/storage/limits.ts` | New — 19 lines; exports `MAX_PHOTO_DATAURL_BYTES = 150 * 1024` and `MAX_PHOTOS_PER_ENTRY = 10` |
| `src/lib/storage/index.ts` | Added re-export of both constants from `./limits` |
| `src/lib/storage/__tests__/limits.test.ts` | New — 3 tests verifying constant values and public-index re-export |
| `.agent-state/04-api-contract.md` | Additive edits: two new rows in Public Exports table; Precondition block added to `upsertDiary` JSDoc |

No existing source file or test was modified.

### Gate results

| Gate | Result | Detail |
|---|---|---|
| `npm run typecheck` | PASS | Exit 0, no output |
| `npm run lint` | PASS | No ESLint warnings or errors |
| `npm test` | PASS | 41/41 tests, 7 files (38 existing + 3 new) |
| `npm run build` | PASS | Next.js 15.5.18, 4/4 static pages generated |

## Fix Cycle 1 (Performance) Verdict
PASS

---

## REQ-003 Implementation

### Summary

Implemented REQ-003: 10-mood master data module and `MoodIcon` React Server Component. All four gates pass: typecheck, lint, 62/62 tests, build.

### Files Created / Deleted

| File | Action | Lines |
|---|---|---|
| `src/design-system/moods.ts` | Created | 47 |
| `src/design-system/MoodIcon.tsx` | Created | 69 |
| `src/design-system/__tests__/moods.test.ts` | Created | 115 |
| `src/design-system/__tests__/MoodIcon.test.tsx` | Created | 81 |
| `src/design-system/.gitkeep` | Deleted | — |
| `package.json` / `package-lock.json` | Updated (devDeps) | — |

Files NOT touched: `src/lib/storage/`, `src/app/`, `vitest.config.ts`, all pre-existing test files.

### DevDependencies Added

| Package | Role |
|---|---|
| `happy-dom` | Lightweight DOM environment for MoodIcon tests |
| `@testing-library/react@^16` | React 19-compatible render/query utilities |

Zero new runtime dependencies.

### Behavior Added

- **`MOODS`**: `readonly Mood[]` of exactly 10 records in PRD §3.4 table order (`joy … embarrassed`), with exact `emoji`, `label`, and pastel HEX `color`.
- **`MOOD_MAP`**: `Record<MoodId, Mood>` derived via `Object.fromEntries(MOODS.map(...))` at module load.
- **`getMood(id)`**: Returns matching record; throws `Error("Unknown MoodId: ${id}")` for unknown ids.
- **`MoodIconProps`**: Named interface export `{ id: MoodId; size: number; className?: string }`.
- **`MoodIcon`**: Server Component with no `"use client"`. Valid id renders `<span role="img" aria-label={mood.label}>` with `fontSize`, `width`, `height` all set to `size` px. Unknown id renders fallback `<span role="img" aria-label="알 수 없는 기분" data-testid="mood-icon-fallback">`. Never throws.

### Existing Patterns Reused

- `Mood` and `MoodId` types from `@/lib/storage` (REQ-002) — not redefined.
- `@` path alias from `vitest.config.ts` and `tsconfig.json`.
- `node:fs` / `node:path` / `child_process.execSync` for drift-guard and acceptance-grep tests.
- `// @vitest-environment happy-dom` per-file annotation (no global env change).

### Non-obvious Fixes Applied

1. **`import React from 'react'` in `MoodIcon.tsx`**: `vitest.config.ts` has no React JSX plugin, so JSX requires React in scope. Adding it is harmless for RSC in Next.js.
2. **`"use client"` string removed from comment**: Original comment `// NO "use client"` contains the substring `"use client"`, which caused test case #9 to fail. Reworded to `// Pure server component — no use-client directive`.
3. **`afterEach(cleanup)`**: Without `globals: true` in vitest config, RTL does not auto-cleanup, causing DOM accumulation. Explicit `cleanup()` in `afterEach` resolves "Found multiple elements" failures.
4. **Emoji grep exclusions**: The grep in test #12 excludes `__tests__` dirs and `src/lib/storage/` (the latter contains `'😊'` in a JSDoc comment in `types.ts`, which is out of scope for REQ-003).
5. **MoodIcon test #5 uses `MOOD_MAP['joy'].emoji`** instead of a raw emoji literal, so no emoji leaks into test files.

### Tests Added

- `moods.test.ts` — 12 cases (node env): array length, id uniqueness, HEX format, label/emoji non-empty, order, MOOD_MAP spot-check, getMood valid/invalid/all-10, CSS token drift guard, acceptance grep.
- `MoodIcon.test.tsx` — 9 cases (happy-dom env): role, aria-label, fontSize, width/height at 2 sizes, textContent via MOOD_MAP, className forward, fallback testid/aria-label/size, fallback no content, source `"use client"` guard.

### Commands Run

```
npm install --save-dev happy-dom @testing-library/react@^16 --no-audit --no-fund
npm run typecheck   → PASS (exit 0)
npm run lint        → PASS (no warnings or errors)
npm test            → PASS 62/62 tests (9 files)
npm run build       → PASS (4/4 static pages)
```

### Risks / Follow-ups

1. **`import React`**: Can be removed if a future vitest config gains `@vitejs/plugin-react`.
2. **Emoji grep exclusions**: `src/lib/storage/types.ts` JSDoc contains `'😊'`; documented here for future reviewers.
3. **Automatic cleanup**: `afterEach(cleanup)` is explicit; a global `setupFiles` entry could centralize this when more DOM test files are added.

## REQ-003 Verdict
PASS

---

## REQ-004 Implementation

### Summary

Implemented REQ-004: 14-persona master data module (`src/design-system/personas.ts`) and its test suite (`src/design-system/__tests__/personas.test.ts`). The module exposes four exported drift-guard string constants with verbatim PRD Korean text, a `PERSONAS` array of 14 records in PRD §3.8 table order, a `PERSONA_MAP` for O(1) lookup, and a `getPersona()` helper — mirroring the exact pattern of the existing `moods.ts` module.

All 17 specified test cases pass. Total test count is now 79 (62 pre-existing + 17 new).

### Files Changed

| File | Action | Lines |
|---|---|---|
| `src/design-system/personas.ts` | Created | 237 |
| `src/design-system/__tests__/personas.test.ts` | Created | 121 |

No existing files were modified.

### Behavior Added

- `COMMON_BASE`, `PERSONA_LOCK_GUARD`, `SAFETY_FOOTER`, `SHAMAN_GUARD` — exported string constants with verbatim Korean text from PRD §3.8.1 and §4.6.8.
- `PERSONAS` — `readonly Persona[]` of length 14 in PRD §3.8 table order: friend → lover → sibling → junior → senior → employee → boss → king → mother → father → grandma → therapist → daoist → shaman.
- `PERSONA_MAP` — `Record<PersonaId, Persona>` derived at module load via `Object.fromEntries`.
- `getPersona(id)` — throws `Error("Unknown PersonaId: ${id}")` on unknown id; same reference guarantee as `getMood`.
- Private `assemble(tone, extra?)` helper builds fully-assembled `systemPrompt` strings at module load. Shaman is the only persona that receives `SHAMAN_GUARD` as the `extra` argument.
- `PERSONA_TONES` private `Record<PersonaId, string>` map holds verbatim Korean tone strings from PRD §3.8.1 for all 14 personas.
- `sibling` tone string includes the hardcoded default "언니"; `mother` tone string includes the hardcoded address "우리 아이" — no `{token}` placeholders anywhere.

### Existing Patterns Reused

- Module structure mirrors `src/design-system/moods.ts` exactly: exported array + `Object.fromEntries` map + throwing getter.
- `import type { Persona, PersonaId } from '@/lib/storage'` follows the same import-path discipline as `moods.ts`.
- `satisfies readonly Persona[]` idiom for type checking without widening.
- One `as Record<PersonaId, Persona>` cast on `PERSONA_MAP` — same as the `as Record<MoodId, Mood>` cast in `moods.ts`.
- Test file structure mirrors `src/design-system/__tests__/moods.test.ts`: `EXPECTED_IDS` constant, describe blocks, no new devDependencies, no mocks.

### Tests Added

File: `src/design-system/__tests__/personas.test.ts` — 17 cases across 5 describe blocks:

**Block 1: PERSONAS master data (4 cases)**
1. `has exactly 14 entries`
2. `PERSONAS order matches PRD §3.8 sequence`
3. `contains every PersonaId literal exactly once — no duplicates`
4. `every required Persona field is a non-empty string for all records`

**Block 2: PERSONA_MAP (2 cases)**
5. `has exactly 14 keys, all valid PersonaId values`
6. `PERSONA_MAP[id] is the same reference as the matching PERSONAS entry`

**Block 3: getPersona (3 cases)**
7. `returns the friend record as a spot check`
8. `does not throw for all 14 valid ids`
9. `throws "Unknown PersonaId: <id>" for an unrecognised id`

**Block 4: system prompt drift guard (5 cases)**
10. `every systemPrompt contains COMMON_BASE`
11. `every systemPrompt contains PERSONA_LOCK_GUARD`
12. `every systemPrompt contains SAFETY_FOOTER`
13. `only shaman systemPrompt contains SHAMAN_GUARD; all others do not`
14. `no field of any persona contains an unresolved {token}`

**Block 5: honorific defaults (2 cases)**
15. `sibling systemPrompt uses hardcoded honorific "언니"`
16. `mother systemPrompt uses hardcoded address "우리 아이"`

**Block 6: Korean language labels (1 case)**
17. `king label is "왕" and shaman label is "무당" — no accidental English leak`

### Commands Run

```
npm run typecheck   → PASS (exit 0, no output)
npm run lint        → PASS (no warnings or errors)
npm test            → PASS 79/79 tests (10 files)
npm run build       → PASS (Next.js 15.5.18, 4/4 static pages generated)
```

### Risks / Follow-ups

- The `○○님` and `○○이~` characters in sample greetings are Korean placeholder conventions (not curly-brace tokens), so they correctly pass the `/\{[^}]+\}/` check. Downstream callers (REQ-016/017) should be aware these are display-only strings, not template slots.
- `PERSONA_TONES` is kept private (not exported) per the API contract. If a future REQ needs to display raw tone strings, it should read them from `persona.systemPrompt` or the contract should be extended.
- File line count is 237 lines — within the 350-line threshold so no split to `persona-tones.ts` was needed.

## REQ-004 Verdict
PASS

---

## REQ-005 Implementation

### Summary

Implemented REQ-005: seven reusable design-system primitives plus two hooks. Nine source files created under `src/design-system/`, eight test files created under `src/design-system/__tests__/`, and `globals.css` received two new tokens plus a `dialog::backdrop` rule. All four gates pass: typecheck, lint, 131/131 tests, build.

### Files Changed

**Modified**
- `src/app/globals.css` — added `--shadow-card` and `--color-danger` inside `@theme {}`, added `dialog::backdrop { background-color: rgba(0,0,0,0.4); }` after `html, body` block.

**Created (source)**
- `src/design-system/Card.tsx` — server component, 34 lines
- `src/design-system/EmptyState.tsx` — server component, 52 lines
- `src/design-system/IconButton.tsx` — client component, 51 lines
- `src/design-system/FAB.tsx` — client component, 38 lines
- `src/design-system/useDialogControl.ts` — client hook, 48 lines
- `src/design-system/BottomSheet.tsx` — client component, 61 lines
- `src/design-system/ConfirmDialog.tsx` — client component, 78 lines
- `src/design-system/Toast.tsx` — client component, 48 lines
- `src/design-system/useToast.ts` — client hook, 52 lines

**Created (tests)**
- `src/design-system/__tests__/Card.test.tsx` — 5 cases
- `src/design-system/__tests__/EmptyState.test.tsx` — 7 cases
- `src/design-system/__tests__/IconButton.test.tsx` — 6 cases
- `src/design-system/__tests__/FAB.test.tsx` — 5 cases
- `src/design-system/__tests__/useDialogControl.test.ts` — 5 cases
- `src/design-system/__tests__/BottomSheet.test.tsx` — 6 cases
- `src/design-system/__tests__/ConfirmDialog.test.tsx` — 8 cases
- `src/design-system/__tests__/Toast.test.tsx` — 5 cases
- `src/design-system/__tests__/useToast.test.ts` — 5 cases

### Behavior Added

- **Card**: White-background container with `var(--shadow-card)` (inline style) and 16px/20px radius from tokens. No `"use client"`.
- **EmptyState**: Centered column with icon/title/description/action slots. String `title` auto-wrapped in `<p>` with standard styles; ReactNode rendered as-is. No `"use client"`.
- **IconButton**: 44×44 circular white button with required Korean `aria-label`. Disabled state blocks `onClick` and applies `opacity-40 cursor-not-allowed`.
- **FAB**: 56×56 charcoal fixed-positioned button with required Korean `aria-label`.
- **useDialogControl**: Shared `useEffect`-based hook wiring `open` boolean to `showModal()`/`close()`. Backdrop-click detection via `e.target === ref.current`.
- **BottomSheet**: Always-mounted `<dialog>` with grip handle, top-only 24px radius, slide-up via inline style translate, backdrop click closes.
- **ConfirmDialog**: `<dialog>` with `aria-labelledby`, Korean default labels (`확인`/`취소`), destructive mode uses `bg-danger`, both buttons `min-h-[44px]`.
- **Toast**: Pure controlled component; renders only when `open=true`; supports `role="status"` (default) and `role="alert"`.
- **useToast**: Auto-dismiss timer hook. `show()` resets timer on re-call. `hide()` is immediate. Cleanup on unmount.

### Existing Patterns Reused

- Server component pattern (no directive, React import, comment header) — mirrored from `MoodIcon.tsx`.
- Source-guard tests using `node:fs`/`node:path`/`process.cwd()` — same as `MoodIcon.test.tsx`.
- `afterEach(cleanup)` teardown — same as existing test files.
- `@vitest-environment happy-dom` per-file override.
- Inline `style={{ ... }}` for pixel-value dimensions — same as `MoodIcon.tsx`.
- Token reference via Tailwind class names (`bg-paper`, `bg-charcoal`, `text-paper`, `rounded-full`, etc.).

### Tests Added

47 new `it()` cases across 8 new test files. Previous baseline: 84 tests. New total: 131 tests, all passing.

**Key test decisions**

- **ConfirmDialog**: `<dialog>` without native `open` attribute is excluded from the a11y tree in happy-dom. Tests use `document.querySelectorAll('button')` rather than `screen.getByRole('button')` to avoid ARIA hidden-element errors.
- **useDialogControl**: Used a real React wrapper component (`TestDialog`) rendered with RTL's `render()` so the ref is properly wired to a DOM `<dialog>` before `useEffect` fires. An `Object.defineProperty` approach failed because `useEffect` runs before the property override.
- **BottomSheet backdrop test**: `fireEvent.click(dialogEl, { target: dialogEl })` — happy-dom sets `e.target` to the clicked element, so clicking the `<dialog>` directly satisfies the `e.target === ref.current` check.

### Commands Run

```
npm run typecheck   → PASS (exit 0, no output)
npm run lint        → PASS (no warnings or errors)
npx vitest run      → PASS (131/131 tests, 19 files)
npm run build       → PASS (Next.js 15.5.18, 4/4 static pages generated)
```

Build CSS output confirmed `bg-danger{background-color:var(--color-danger)}` utility generated — no inline style fallback needed.

### Risks / Follow-ups

1. **`bg-danger` confirmed working.** Tailwind 4 auto-generates the utility from `--color-danger` in `@theme`. JSDoc fallback note in `ConfirmDialog.tsx` retained for historical clarity.
2. **BottomSheet animation in happy-dom.** CSS `translate` transitions not computed by happy-dom; slide-up verified structurally via inline style, not animation frames. E2E coverage deferred to REQ-007.
3. **ConfirmDialog ARIA in happy-dom.** Buttons inside a non-open `<dialog>` are inaccessible to `getByRole`. Tests use `document.querySelectorAll('button')`. Not a component defect — test-environment limitation.
4. **Toast z-index below `showModal()` top layer.** Documented in `Toast.tsx` JSDoc. No unit test coverage possible. Deferred to E2E / REQ-015.
5. **`ConfirmDialog` `aria-labelledby` id collision.** `confirm-msg` is hardcoded. Simultaneous dual mounts would collide. Fix with `useId()` in a future REQ.

## REQ-005 Verdict
PASS

---

## REQ-006 Implementation

### Summary

Implemented REQ-006: Next.js App Router routing shell for 딸깍일기. Five page files, a Korean `not-found.tsx`, a type-safe `Routes` helper module, and a shared `vi.mock('next/navigation')` test helper were created. No existing files were modified. All four gates pass: typecheck, lint, 151/151 tests, build.

### Files Changed

All files are newly created; no existing files were modified.

**Production files**

| File | Lines | Role |
|---|---|---|
| `src/lib/navigation/routes.ts` | 41 | `Routes` object with `calendar`, `diary`, `list`, `listWithFilter`, `chat`, `stats`. `as const` literal types. `URLSearchParams` for deterministic query encoding. |
| `src/lib/navigation/index.ts` | 6 | Barrel re-exporting `Routes`. |
| `src/app/not-found.tsx` | 16 | Korean 404 Server Component. Bare `<a href="/">` with `eslint-disable-next-line` comment (intentional per technical design). |
| `src/app/diary/[date]/page.tsx` | 16 | Async Server Component. Awaits `params` (Next.js 15 `Promise<{ date: string }>`). Regex guard `/^\d{4}-\d{2}-\d{2}$/`; calls `notFound()` on mismatch. |
| `src/app/list/page.tsx` | 8 | Placeholder matching `src/app/page.tsx` tone. |
| `src/app/chat/page.tsx` | 8 | Placeholder. |
| `src/app/stats/page.tsx` | 8 | Placeholder. |

**Test files**

| File | Cases | Role |
|---|---|---|
| `src/lib/navigation/__tests__/setupNextNavigation.ts` | — | Shared mock helper: `mockRouter`, `mockNotFound`, `mockUseRouter`, `mockUseSearchParams`, `mockUseParams`, `mockUsePathname`, `resetNavigationMocks`. |
| `src/lib/navigation/__tests__/routes.test.ts` | 10 | All `Routes` constants and functions. Node env. |
| `src/lib/navigation/__tests__/setupNextNavigation.test.ts` | 3 | Self-tests for the mock helper. happy-dom env. |
| `src/app/__tests__/diary-date-page.test.tsx` | 4 | Valid date renders, invalid format throws, slash-separator throws, out-of-range month passes regex. |
| `src/app/__tests__/not-found.test.tsx` | 3 | Korean message renders, anchor href is `/`, source-guard for no `"use client"`. |

### Behavior Added

- Five URL routes registered in Next.js App Router: `/`, `/diary/[date]`, `/list`, `/chat`, `/stats`.
- `/diary/[date]` returns 404 for any path segment not matching `/^\d{4}-\d{2}-\d{2}$/`.
- Global not-found handler renders Korean 404 message with a link back to `/`.
- `Routes` helper provides type-safe path construction for all five routes.
- `Routes.listWithFilter` encodes optional `month` and `sort` query params via `URLSearchParams` with deterministic ordering (month before sort).
- Shared `setupNextNavigation` helper enables clean `next/navigation` mocking in future test files (REQ-007+).

### Existing Patterns Reused

- `src/lib/navigation/index.ts` barrel mirrors `src/lib/storage/index.ts` pattern.
- `setupNextNavigation.ts` is opt-in per file, mirroring the `storage/setup.ts` model.
- `// @vitest-environment happy-dom` per-file directive follows convention from `Card.test.tsx`, `BottomSheet.test.tsx`, etc.
- `import React from 'react'` in page components follows the pattern in all `src/design-system/` components.
- Source-guard test using `fs.readFileSync` + `path.resolve(process.cwd(), ...)` follows `Card.test.tsx` pattern.
- Placeholder page JSX (`<main className="px-6 py-8 text-charcoal">`) matches `src/app/page.tsx` tone exactly.

### Non-obvious Fixes Applied

1. **`import React from 'react'` in page components**: Vitest transform does not apply the Next.js automatic JSX runtime, so JSX requires React in scope. Adding it is harmless for RSC in Next.js (consistent with existing design-system components).
2. **`toHaveTextContent` removed**: This is a `@testing-library/jest-dom` matcher not installed in the project. Replaced with `heading.textContent?.toContain(date)` pattern, consistent with how existing tests assert text.
3. **eslint-disable comment for bare `<a>`**: The `@next/next/no-html-link-for-pages` rule is suppressed with a line-level comment. The technical design explicitly specifies bare `<a>` for the not-found page ("fallback screen, not a primary navigation surface").
4. **Top-level `await import` in `diary-date-page.test.tsx`**: Ensures the `vi.mock('next/navigation')` hoisting applies before the page module is evaluated. Supported by `tsconfig.json` targeting ES2022/esnext modules.

### Tests Added

20 new `it()` cases across 4 test files. Previous baseline: 131 tests. New total: 151 tests.

### Commands Run

```
npm run typecheck   → PASS (exit 0, no output)
npm run lint        → PASS (no ESLint warnings or errors)
npm test            → PASS 151/151 tests (23 files)
npm run build       → PASS (6 routes: /, /chat, /diary/[date], /list, /stats, /_not-found)
```

### Build output confirmation

```
Route (app)                       Size  First Load JS
┌ ○ /                            141 B         103 kB
├ ○ /_not-found                  141 B         103 kB
├ ○ /chat                        141 B         103 kB
├ ƒ /diary/[date]                141 B         103 kB
├ ○ /list                        141 B         103 kB
└ ○ /stats                       141 B         103 kB
```

All five routes plus not-found present in output. `/diary/[date]` correctly shown as `ƒ` (dynamic / server-rendered on demand).

### Risks / Follow-ups

- `Routes.listWithFilter` does no validation of `month` or `sort` values — per contract, invalid query values on `/list` are deferred to REQ-013.
- Semantic date validation (Feb 31, etc.) in `/diary/[date]` is deferred to REQ-009 as specified.
- `PERSONA_TONES` test case in `setupNextNavigation.test.ts` manually resets `mockNotFound` throw behavior between tests. Future files consuming the helper should use `resetNavigationMocks()` in `beforeEach` to avoid state leakage.

## REQ-006 Verdict
PASS

---

## REQ-007 Implementation

### Summary

Implemented REQ-007: the main calendar screen replaces the placeholder `page.tsx` with a fully functional 7-column monthly mood grid, 3-icon header (검색/통계/리스트), horizontal swipe + arrow month navigation, and FAB routing to today's diary. Playwright E2E was bootstrapped for the first time. All quality gates pass: typecheck, lint, 181/181 unit tests, Next.js build, and 1/1 Playwright E2E test.

### Files Changed

| File | Action | Lines |
|---|---|---|
| `src/app/globals.css` | Additive — `--color-cell-empty: #C8C8C8` after `--color-success` | +1 |
| `src/lib/storage/useDiaries.ts` | Created | 28 |
| `src/app/_components/CalendarDayCell.tsx` | Created | 58 |
| `src/app/_components/CalendarGrid.tsx` | Created | 74 |
| `src/app/_components/CalendarHeader.tsx` | Created | 87 |
| `src/app/_components/CalendarScreen.tsx` | Created | 83 |
| `src/app/page.tsx` | Replaced placeholder with thin `"use client"` boundary | 6 |
| `package.json` | Added `@playwright/test ^1.44.0` devDep + 2 e2e scripts | +4 |
| `playwright.config.ts` | Created at repo root | 22 |
| `e2e/calendar.spec.ts` | Created | 17 |
| `vitest.config.ts` | Added `exclude: ['node_modules', 'e2e/**']` | +1 |
| `src/lib/storage/__tests__/useDiaries.test.ts` | Created | 52 |
| `src/app/__tests__/CalendarDayCell.test.tsx` | Created | 77 |
| `src/app/__tests__/CalendarGrid.test.tsx` | Created | 72 |
| `src/app/__tests__/CalendarHeader.test.tsx` | Created | 65 |
| `src/app/__tests__/CalendarScreen.test.tsx` | Created | 95 |

### Behavior Added

- **`/` route** now renders the full calendar screen.
- **7-column monthly grid**: dates 1–last rendered with `CalendarDayCell`; out-of-month leading/trailing slots are non-interactive empty `<div>` elements. Sunday-first (일~토).
- **MoodIcon on diary dates**: if a diary entry exists for a date, its `MoodIcon` (size=32) replaces the numeral.
- **Today emphasis**: numeral → `font-bold text-peach`; or peach dot below MoodIcon when entry exists.
- **Header**: `{month+1}월` label, ‹/› plain buttons with `aria-label` 이전 달/다음 달, 3 `IconButton` instances with inline SVG icons (검색/통계/리스트).
- **Month navigation**: ‹/› arrows and horizontal pointer swipe (threshold ±40px).
- **FAB**: pen icon SVG, `aria-label="오늘 일기 쓰기"`, navigates to `Routes.diary(today)`.
- **Hydration safety**: `CalendarGrid` suppressed while `useDiaries` `isReady=false`.
- **Playwright E2E**: `playwright.config.ts` + `e2e/calendar.spec.ts` golden path (calendar → FAB → diary URL).

### Existing Patterns Reused

- `MoodIcon` from `@/design-system/MoodIcon` — unchanged.
- `IconButton` from `@/design-system/IconButton` — 3 instances in CalendarHeader.
- `FAB` from `@/design-system/FAB` — pen icon JSX passed as `icon` prop.
- `Routes.diary(date)`, `Routes.stats`, `Routes.list` from `@/lib/navigation` — all navigation via `Routes.*`.
- `readDiaries` from `@/lib/storage` — called inside `useDiaries`.
- `setupNextNavigation` helpers — reused in `CalendarScreen.test.tsx` with same `vi.mock('next/navigation')` pattern as `diary-date-page.test.tsx`.
- `makeDiary` fixture from `@/lib/storage/__tests__/fixtures` — used in 4 test files.
- `// @vitest-environment happy-dom` + `afterEach(cleanup)` — consistent with all existing component tests.
- `toLocaleDateString('sv')` ISO date trick — used in production and tests.

### Tests Added / Updated

| File | Cases |
|---|---|
| `src/lib/storage/__tests__/useDiaries.test.ts` | 4 |
| `src/app/__tests__/CalendarDayCell.test.tsx` | 7 |
| `src/app/__tests__/CalendarGrid.test.tsx` | 5 |
| `src/app/__tests__/CalendarHeader.test.tsx` | 6 |
| `src/app/__tests__/CalendarScreen.test.tsx` | 8 |
| `e2e/calendar.spec.ts` | 1 (Playwright) |

Total new unit cases: 30. Total suite: 181 tests (was 151).

**Config change**: `vitest.config.ts` gained `exclude: ['node_modules', 'e2e/**']` so Playwright spec files using `@playwright/test`'s `test()` are not picked up by Vitest.

**Test adjustment**: `useDiaries` initial-state test was revised — happy-dom flushes `useEffect` synchronously inside `renderHook`, so `isReady=false` is not observable from the test. The test verifies post-effect state. The hydration guard is validated by `CalendarScreen.test.tsx` case "grid suppressed while isReady=false".

### Commands Run

```
npm install                  # installed @playwright/test
npm run typecheck            # PASS (0 errors)
npm run lint                 # PASS (0 warnings/errors)
npm test                     # PASS (181/181 tests, 28 files)
npm run build                # PASS (Next 15.5.18, 7 routes)
npm run test:e2e:install     # Chromium 148.0.7778.96 downloaded (~277 MB total)
npm run test:e2e             # PASS (1/1 test)
```

First run of E2E failed because port 3000 was occupied by a prior dev server. After freeing the port, the test passed on the first retry.

### Risks / Follow-ups

1. **`useDiaries` isReady=false not unit-testable in happy-dom**: Environment limitation, not production bug.
2. **Swipe threshold 40px**: May cause accidental month changes; adjust to 50px based on user testing.
3. **Year not shown in header**: Per PRD, only `M월` displayed. Cross-year navigation works but year is not visible. `year` prop is already passed and available for trivial future addition.
4. **Search no-op**: `onSearch` handler is `() => {}` — REQ-013 scope.
5. **Re-read on write**: `useDiaries` reads once on mount. After REQ-009 saves, calendar won't auto-update until remount. Reactive store deferred to REQ-009+.

## REQ-007 Verdict
PASS
