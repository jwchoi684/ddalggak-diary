# Test Report — REQ-004

## Summary

All four verification commands pass. 79/79 tests pass across 10 test files. The 17
REQ-004 cases in `personas.test.ts` match the plan's `it()` descriptions and describe
blocks exactly. The 62 pre-existing REQ-002 + REQ-003 tests are unaffected. All source
guards (no `as any`, no barrel `index.ts`, correct `SAFETY_FOOTER` value, SHAMAN_GUARD
isolation) are confirmed by direct file inspection.

---

## Commands Run

| Command | Exit code | Notable output |
|---|---|---|
| `npm run typecheck` | 0 | No output (clean) |
| `npm run lint` | 0 | "No ESLint warnings or errors" (`next lint` deprecation notice is cosmetic, pre-existing) |
| `npm test` | 0 | 79 passed (10 files), 2.11 s |
| `npm run build` | 0 | Next.js 15.5.18 — 4/4 static pages generated |

---

## Test Case Coverage vs Plan

All 17 plan cases present in `src/design-system/__tests__/personas.test.ts` (121 lines).

| # | Plan `it()` description | Describe block | Status |
|---|---|---|---|
| 1 | `has exactly 14 entries` | PERSONAS master data | PASS |
| 2 | `PERSONAS order matches PRD §3.8 sequence` | PERSONAS master data | PASS |
| 3 | `contains every PersonaId literal exactly once — no duplicates` | PERSONAS master data | PASS |
| 4 | `every required Persona field is a non-empty string for all records` | PERSONAS master data | PASS |
| 5 | `has exactly 14 keys, all valid PersonaId values` | PERSONA_MAP | PASS |
| 6 | `PERSONA_MAP[id] is the same reference as the matching PERSONAS entry` | PERSONA_MAP | PASS |
| 7 | `returns the friend record as a spot check` | getPersona | PASS |
| 8 | `does not throw for all 14 valid ids` | getPersona | PASS |
| 9 | `throws "Unknown PersonaId: <id>" for an unrecognised id` | getPersona | PASS |
| 10 | `every systemPrompt contains COMMON_BASE` | system prompt drift guard | PASS |
| 11 | `every systemPrompt contains PERSONA_LOCK_GUARD` | system prompt drift guard | PASS |
| 12 | `every systemPrompt contains SAFETY_FOOTER` | system prompt drift guard | PASS |
| 13 | `only shaman systemPrompt contains SHAMAN_GUARD; all others do not` | system prompt drift guard | PASS |
| 14 | `no field of any persona contains an unresolved {token}` | system prompt drift guard | PASS |
| 15 | `sibling systemPrompt uses hardcoded honorific "언니"` | honorific defaults | PASS |
| 16 | `mother systemPrompt uses hardcoded address "우리 아이"` | honorific defaults | PASS |
| 17 | `king label is "왕" and shaman label is "무당" — no accidental English leak` | Korean language labels | PASS |

---

## REQ-002 + REQ-003 Regression Check

62/62 pre-existing tests still pass:

- REQ-002 (storage layer): 41 tests across 7 files — all passing.
- REQ-003 (moods + MoodIcon): 21 tests across 2 files — all passing.

No existing file was modified by REQ-004.

---

## Drift-Guard Constants Verified

Inspected `src/design-system/personas.ts` directly (lines 10–38, 29):

- `COMMON_BASE` — present, exported, injected by `assemble()` as first element of `parts`.
- `PERSONA_LOCK_GUARD` — present, exported, injected by `assemble()` as third element of `parts`.
- `SAFETY_FOOTER` — present, exported. Verbatim value:
  `'단, 사용자를 존중하는 선을 항상 지킬 것.'` — matches plan requirement exactly.
- `SHAMAN_GUARD` — present, exported. Value:
  `'점괘로 미래를 단정하거나 불안을 조성하지 말 것 — 어디까지나 캐릭터 연기.'`

---

## SHAMAN_GUARD Isolation Spot-check

- `shaman.systemPrompt` contains SHAMAN_GUARD: YES — `assemble(PERSONA_TONES.shaman, SHAMAN_GUARD)` at line 225 is the only `assemble()` call that passes a second argument.
- `friend.systemPrompt` contains SHAMAN_GUARD: NO — `assemble(PERSONA_TONES.friend)` at line 115 receives no `extra` argument; the `if (extra !== undefined)` branch in `assemble()` is skipped.
- Test case 13 loops all 13 non-shaman personas and asserts `.not.toContain(SHAMAN_GUARD)` for each; confirmed passing.

---

## Order Verification

`PERSONAS.map(p => p.id)` equals PRD §3.8 order — confirmed by test case 2 and direct inspection of the array literal in `personas.ts` (lines 109–229):

`friend → lover → sibling → junior → senior → employee → boss → king → mother → father → grandma → therapist → daoist → shaman`

---

## Source Guards

- No `as any` in `personas.ts`: grep returned no output.
- One `as Record<PersonaId, Persona>` cast on `PERSONA_MAP` at line 241 — consistent with the `as Record<MoodId, Mood>` pattern in `moods.ts`, as documented in the API contract.
- No barrel `src/design-system/index.ts`: directory listing shows only `__tests__/`, `MoodIcon.tsx`, `moods.ts`, `personas.ts` — no `index.ts` present.

---

## Discrepancies / Notes

- The implementation report's block numbering labels "Block 5" as honorific defaults and "Block 6" as Korean language labels, while the test plan labels them "Block 4" and "Block 5" respectively. The test file itself contains no numbered block labels and matches the plan's five `describe` blocks with correct content — this is a documentation discrepancy only, not a coverage gap.
- `personas.ts` is 264 lines by file line count; the implementation report stated 237. The difference is trailing blank lines and the closing lines of the file. The module remains single-responsibility and within the 350-line threshold cited in the implementation report.
- The CJS Vite deprecation warning at test startup is cosmetic and pre-existing (documented in `07-implementation-report.md`).

---

## Verdict
PASS
