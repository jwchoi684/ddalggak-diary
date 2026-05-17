# Release Report — REQ-004

## Gate Matrix

| Phase | Report | Verdict | Rationale |
|---|---|---|---|
| 00 Git Safety | `00-git-safety.md` | PASS | No git repo; no unrelated user changes possible |
| 01 Requirement Intake | `01-requirement-intake.md` | PASS | 14-persona scope fully bounded; 9 invariants and 6 open-question resolutions documented |
| 02 Architecture | `02-architecture-report.md` | PASS | `src/design-system/personas.ts` placement confirmed; `Persona`/`PersonaId` types verified pre-existing in `@/lib/storage` |
| 03 Technical Design | `03-technical-design.md` | PASS | Assembly strategy (b), `PERSONA_TONES` map, four exported constants, `assemble()` private helper, and 17-case test plan all specified |
| 04 API Contract | `04-api-contract.md` | PASS | 7 exports typed; error contract, import-path discipline, and caller invariants locked |
| 05 DB / Migration | `05-db-migration-report.md` | PASS | Not applicable — compile-time constant table; no schema or storage change |
| 06 Test Plan | `06-test-plan.md` | PASS | 17 cases across 5 describe blocks; all 14 API-contract caller invariants mapped |
| 07 Implementation | `07-implementation-report.md` | PASS (REQ-002 ref) | Confirmed by test report: files and line counts verified; implementation covers REQ-002/003 work |
| 08 Test Report | `08-test-report.md` | PASS | 79/79 tests (17 new + 62 REQ-002/003 regression); typecheck, lint, build all exit 0 |
| 09 Code Review | `09-code-review-report.md` | PASS | All 7 exports contract-conformant; Korean text spot-checked verbatim against PRD; 3 non-blocking suggestions; no blocking issues |
| 10 Security | `10-security-report.md` | PASS | Zero jailbreak phrases; no `{diaries_serialized}` token; no new audit findings; 6 carry-forward items unchanged from REQ-003 |
| 11 Performance | `11-performance-report.md` | PASS | All INFO/Low; ~113 tokens per systemPrompt baseline; ~1.5–2 KB gzipped bundle delta |
| 12 Infra | `12-infra-report.md` | PASS | Not applicable; zero infra surface; build clean; no new dependencies |
| 13 E2E | `13-e2e-report.md` | PASS — not applicable | Pure data module; no UI surface; no E2E framework present; first browser E2E lands with REQ-007 |

All 14 gates: PASS.

## Files Changed

### Created

| File | Lines | Role |
|---|---|---|
| `src/design-system/personas.ts` | 264 | 4 drift-guard constants, `PERSONA_TONES` private map, `assemble()` private helper, `PERSONAS` ordered array (satisfies), `PERSONA_MAP` O(1) record, `getPersona()` helper |
| `src/design-system/__tests__/personas.test.ts` | 121 | 17 node-env unit tests: data integrity, helper contract, drift-guard, honorific defaults, Korean language labels |

### Modified

None. No existing file was touched.

### Deleted

None.

## Fix Cycles

None. All gates passed on the first cycle.

## Net Effect

The project gains the 14-persona master data layer. Any downstream REQ can resolve a `PersonaId` to emoji, Korean label, short description, sample greeting, and a fully assembled Korean `systemPrompt` (common base + persona tone + persona-lock guard + safety footer, with the shaman no-fortune-telling guard applied exclusively to that persona) with a single `getPersona(id)` call or `PERSONA_MAP[id]` lookup. The assembly is done once at module load from four named, exported, testable constants — no string is duplicated across persona records. REQ-017's wrapper becomes a one-liner (`${persona.systemPrompt}\n\n[사용자 일기 데이터]\n${corpus}`). REQ-016 can iterate `PERSONAS` for a predictable picker grid without re-sorting.

## Forward-Flagged Constraints

| Constraint | Owner REQ | Severity |
|---|---|---|
| REQ-017 must NOT re-assemble `systemPrompt` from drift-guard constants — read `persona.systemPrompt` directly | REQ-017 | Required |
| REQ-017 must NOT include `sampleGreeting` in LLM context — it is illustrative copy only (shaman greeting contains a mild future-prediction phrase) | REQ-017 | Required |
| REQ-016/017 should prefer `PERSONA_MAP[id]` over `getPersona(id)` on the hot LLM-call path | REQ-017 | Low |
| `sampleGreeting` JSDoc on `Persona` interface in `src/lib/storage/types.ts` should note "illustrative only, not for LLM context" when that file is next touched | REQ-016 or 017 | Low |
| Adding a 15th persona requires expanding `PersonaId` union + potential `ddalkkak:conversations:v2` key bump for stored `personaId` fields | Future persona REQ | High |
| `JSON.parse` without prototype-pollution guard in storage layer (carry-forward from REQ-002) | REQ-019 hard gate | Medium |
| `Photo.dataUrl` stored without format validation (carry-forward from REQ-002) | REQ-011 hard gate | Medium |
| `postcss < 8.5.10` advisory (GHSA-qx2v-qp2m-jg93) outstanding — clean before REQ-017 to clear audit baseline | Dependency hygiene cycle | Low |
| Vitest CJS deprecation warning cosmetic; resolve before CI is wired | CI setup REQ | Low |

## Commit Message Draft

```
feat(design-system): add 14-persona master data + system prompts (REQ-004)

- src/design-system/personas.ts: COMMON_BASE, PERSONA_LOCK_GUARD,
  SAFETY_FOOTER, SHAMAN_GUARD drift-guard constants (exported);
  private PERSONA_TONES map + assemble() helper build fully-assembled
  systemPrompt at module load; PERSONAS ordered array (PRD §3.8 order,
  satisfies readonly Persona[]), PERSONA_MAP O(1) record, getPersona()
  throwing helper mirroring getMood().
- src/design-system/__tests__/personas.test.ts: 17 cases — data integrity,
  PERSONA_MAP/getPersona contract, systemPrompt drift guards (.toContain
  for all 4 constants), honorific hardcoding (언니/우리 아이), no {token}
  regex, Korean label spot-check.
- 79/79 tests pass (17 new + 62 REQ-002/003 unchanged); typecheck, lint,
  build all clean. No new dependencies.

REQ-016 (persona picker) and REQ-017 (LLM call) are now unblocked.
shaman guard is exclusive: assemble() inserts SHAMAN_GUARD only for
shaman; test case 13 enforces exclusivity across all 13 others.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## PR Body

```md
## Summary

- Adds the 14-persona master data module (`src/design-system/personas.ts`)
  with emoji, Korean labels, short descriptions, sample greetings, and
  fully-assembled Korean system prompts sourced verbatim from PRD §3.8 and §3.8.1.
- Exposes four drift-guard string constants (`COMMON_BASE`, `PERSONA_LOCK_GUARD`,
  `SAFETY_FOOTER`, `SHAMAN_GUARD`) so tests can assert invariants without
  hardcoding Korean strings in test files.
- REQ-016 (persona picker) and REQ-017 (AI chat + LLM call flow) are now unblocked.

## Acceptance Criteria

- [x] 14 personas match PRD §3.8 table (id, emoji, label, shortDesc) verbatim.
- [x] Every `systemPrompt` contains `COMMON_BASE`, `PERSONA_LOCK_GUARD`, `SAFETY_FOOTER`.
- [x] Only `shaman.systemPrompt` contains `SHAMAN_GUARD`; all 13 others do not.
- [x] `sibling.systemPrompt` uses hardcoded "언니"; `mother.systemPrompt` uses "우리 아이".
- [x] No field of any persona contains an unresolved `{token}`.
- [x] `PERSONAS` order is stable and matches PRD §3.8 table order (friend first, shaman last).
- [x] `getPersona('not-a-real-id')` throws `"Unknown PersonaId: not-a-real-id"`.

## Technical Notes

- `systemPrompt` is fully assembled at module load from a single `assemble(tone, extra?)`
  helper — no assembly at call-time, no duplication of base/footer strings across 14 literals.
- REQ-017 wrapper is a one-liner: `${persona.systemPrompt}\n\n[사용자 일기 데이터]\n${corpus}`.
- `PERSONA_TONES` and `assemble` are not exported; only the assembled strings are public.
- The documented `as Record<PersonaId, Persona>` cast on `PERSONA_MAP` mirrors `moods.ts`
  and is the only non-`as any` cast in the file.

## API / Interface Changes

New public surfaces (internal, no external API):

- `@/design-system/personas`: `COMMON_BASE`, `PERSONA_LOCK_GUARD`, `SAFETY_FOOTER`,
  `SHAMAN_GUARD`, `PERSONAS`, `PERSONA_MAP`, `getPersona`

No changes to `@/lib/storage` types or any existing public surface.

## Data / Migration Notes

Not applicable. Persona master data is a compile-time constant. `PersonaId` union and
`Persona` interface in `src/lib/storage/types.ts` are unchanged. Existing stored
`personaId` strings in `localStorage` remain valid.

## Tests

- 17 node-env unit tests in `personas.test.ts` (data integrity, drift guard, honorific
  defaults, no-token regex, Korean label spot-check).
- 62 REQ-002 + REQ-003 regression tests still passing (79/79 total).

## Security Review

PASS. Zero new runtime attack surface. No jailbreak phrases in any persona tone or
system prompt. `{diaries_serialized}` not present anywhere in persona data. Diary-corpus
injection is REQ-017's responsibility. Six carry-forward items from REQ-003 are
unchanged and tracked.

## E2E Evidence

Not applicable for REQ-004. No UI surface; `personas.ts` is not mounted in any page.
First browser E2E gate is REQ-007 (calendar grid). Unit coverage closes all 14 caller
invariants from the API contract.

## Risk / Rollback Plan

Low risk. Rollback = delete two files from `src/design-system/`. No deployed
infrastructure, no database migration, no stored-data impact. Downstream REQs
(016, 017, 018) do not exist yet, so there is no integration surface to break.
```

## Next REQ

**REQ-005 — 디자인 시스템 프리미티브** (status: TODO)

Expected scope: 7 UI primitive components — `IconButton` (white circular 44 px), `Card` (white, radius 16–20, shadow y=2 blur=8 opacity=0.04), `FAB` (black 56 px), `BottomSheet` (top-rounded 24 px + grip handle), `Toast` (pill shape, 1.5–2 s auto-dismiss), `ConfirmDialog`, `EmptyState` — all placed under `src/design-system/` using Tailwind design tokens from REQ-001. REQ-005 has no data-layer dependencies (depends only on REQ-001) and can run in parallel with REQ-006 (navigation shell). It unblocks REQ-007 (calendar), REQ-008 (mood picker), REQ-009 (editor), REQ-013 (list), and REQ-014 (stats). Primary risk: prop signatures set here propagate to all screen REQs — too narrow now means workaround code from REQ-007 onward.

## Verdict

PASS — ready to mark REQ-004 DONE.
