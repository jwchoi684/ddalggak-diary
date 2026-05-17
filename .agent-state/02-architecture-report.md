# Architecture Report

## Summary

REQ-004 adds the 14-persona master data module to a Next.js 15 / React 19 / TypeScript 5 / Tailwind 4 / Vitest 2 project that is already scaffolded (Option C from REQ-001). REQ-003 (`moods.ts`) delivered an identical structural pattern and is the explicit template. All required TypeScript types (`Persona`, `PersonaId`) are already published in `src/lib/storage/types.ts` and re-exported from `src/lib/storage/index.ts`. No new dependencies, no new routes, no React component. The deliverable is a single data + helper file at `src/design-system/personas.ts` plus a parallel test file at `src/design-system/__tests__/personas.test.ts`.

## Frontend Findings

There is no React component in this REQ. The only frontend artifact is the pure-data module. The existing `MoodIcon.tsx` component confirms the design-system folder is used for both data modules and presentational components, but persona icons are explicitly deferred to REQ-016.

Downstream consumers that will import from `src/design-system/personas.ts`:
- REQ-016 (persona picker UI) — iterates `PERSONAS` for the grid.
- REQ-017 (active chat session + LLM call) — reads `persona.systemPrompt` and appends the diary corpus.
- REQ-018 (past conversation, read-only) — reads `persona.label`/`emoji` for display.

None of those consumers exist yet, so there is no integration surface to protect during this REQ.

## Backend Findings

Not applicable. REQ-004 is pure client-side constant data. No API routes, no server actions, no LLM call in this REQ.

## Data Model Findings

`Persona` and `PersonaId` are already fully defined in `src/lib/storage/types.ts`. The six required fields are: `id: PersonaId`, `emoji: string`, `label: string`, `shortDesc: string`, `systemPrompt: string`, `sampleGreeting: string`. No schema changes are needed.

`PersonaId` union has 14 members: `friend | lover | sibling | employee | boss | king | grandma | therapist | daoist | shaman | junior | senior | mother | father`. The PRD §3.8 table order for `PERSONAS` is: friend → lover → sibling → junior → senior → employee → boss → king → mother → father → grandma → therapist → daoist → shaman. The `satisfies readonly Persona[]` annotation enforces union membership at compile time regardless of order; the array order is enforced by the test file.

## Test Structure Findings

Test environment: `node` (global config in `vitest.config.ts`). The `localStorage` shim in `src/lib/storage/__tests__/setup.ts` is registered as a `setupFile` and runs for all tests, but `personas.test.ts` will not exercise localStorage — the setup is harmless overhead.

The test template to mirror is `src/design-system/__tests__/moods.test.ts`. Key patterns to replicate:
- Import `PERSONAS`, `PERSONA_MAP`, `getPersona` from `@/design-system/personas`.
- Import `type PersonaId` from `@/lib/storage`.
- `satisfies` ensures compile-time coverage; runtime tests add length (14), id-set uniqueness, exhaustive id membership.
- REQ-004 adds safety-string drift guards not present in `moods.test.ts`: assert every `systemPrompt` contains the `SAFETY_FOOTER` phrase, the `PERSONA_LOCK_GUARD` phrase, and (for shaman only) the no-fortune-telling guard. Use named exported constants + `.toContain()`.
- Additional invariant test: no field in any persona contains an unresolved `{...}` template token (regex `/\{[^}]+\}/`). Enforces "no `{userName}`, no `{diaries_serialized}`".
- The CSS drift-guard block from `moods.test.ts` has no equivalent here (no CSS tokens for personas).
- The "no raw emoji outside personas.ts" acceptance grep is not required by REQ-004 (persona emojis are used ad-hoc in UI text, unlike mood emojis which back calendar cells).

Test command: `npm test` (`vitest run`).

## Tooling and Commands

| Purpose | Command |
|---|---|
| Run all tests | `npm test` |
| Watch mode | `npm run test:watch` |
| Type-check | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |

No new devDependencies required. All test infrastructure (Vitest, node environment, localStorage shim setup, `@/` path alias) is already operational from REQ-002/003.

## Existing Patterns to Reuse

1. **Module structure from `moods.ts`**: `PERSONAS satisfies readonly Persona[]` → `PERSONA_MAP` via `Object.fromEntries` → `getPersona(id)` throwing `"Unknown PersonaId: ${id}"`. Copy this pattern verbatim, substituting names.
2. **Import shape**: `import type { Persona, PersonaId } from '@/lib/storage'` — identical to `moods.ts` line 1.
3. **`satisfies` keyword** for compile-time union exhaustiveness without widening the inferred type.
4. **Test structure from `moods.test.ts`**: describe blocks for data array, map, and helper. Exhaustive id list for iteration. `.toEqual(EXPECTED_IDS)` for order assertion.
5. **`COMMON_BASE` / `PERSONA_LOCK_GUARD` / `SAFETY_FOOTER` / `SHAMAN_GUARD` constants + small `assemble(tone, extra?)` helper** inside `personas.ts` — assembled at module load, exported for drift-guard test import. This is REQ-004's new pattern (no `moods.ts` analogue) and sets the precedent for REQ-017's wrapper.

## Files Likely to Change

- **New file**: `src/design-system/personas.ts`
- **New file**: `src/design-system/__tests__/personas.test.ts`

No existing files require modification. `src/lib/storage/types.ts` and `src/lib/storage/index.ts` are read-only for this REQ.

## Risks

1. **`systemPrompt` content quality** — Medium risk per intake, specifically because the Korean cultural personas (왕·도사·무당) have unusual tone requirements. The shaman guard (no fortune-telling / no anxiety-inducing content) must appear verbatim in a testable phrase. Mitigation: export `SHAMAN_GUARD` as a named constant and test with `.toContain(SHAMAN_GUARD)`.

2. **File length** — 14 personas with assembled `systemPrompt` strings will likely produce a 200–350 line file. CLAUDE.md explicitly exempts constant tables from the 100-line rule. If the file crosses ~350 lines, the per-persona tone strings should be extracted to `src/design-system/persona-tones.ts` at implementation time once actual line count is visible. Do not pre-split.

3. **`PersonaId` union order vs `PERSONAS` array order** — the union is unordered; PRD §3.8 defines a canonical display order. `satisfies` only checks membership, not sequence. The order test in `personas.test.ts` is the sole enforcement mechanism.

## Unknowns

1. The exact Korean text for each persona's tone paragraph, `shortDesc`, and `sampleGreeting` must be sourced from PRD §3.8 / §3.8.1. The implementation agent must read `docs/requirements.md` §3.8 and §3.8.1 verbatim before authoring any Korean string content.
2. The exact canonical Korean phrase for the persona-lock guard (§4.6.8) and the safety footer (§3.8) — these must be extracted verbatim from the PRD, not paraphrased, so the drift-guard test is meaningful.

## Verdict
PASS
