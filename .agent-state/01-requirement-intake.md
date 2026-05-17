# Requirement Intake — REQ-004

## Restatement

Build the master data table for the **14 locked personas** (friend, lover, sibling, junior, senior, employee, boss, king, mother, father, grandma, therapist, daoist, shaman) so that any downstream chat REQ can resolve a `PersonaId` into emoji, Korean label, one-line description, sample greeting, and a Korean LLM `systemPrompt` that already embeds the §3.8.1 common base, the §4.6.8 persona-lock guard, and the "사용자를 존중하는 선" safety footer (plus shaman's no-fortune-telling guard). Also expose a `getPersona(id)` lookup helper mirroring `getMood(id)` from REQ-003. This REQ produces **data + one helper only** — no picker UI, no LLM-call assembly, no honorific customization.

## In Scope

- A single master-data module under `src/design-system/` exporting:
  - An ordered `PERSONAS` array of all 14 records (length and member ids exhaustively matching `PersonaId`).
  - A `PERSONA_MAP: Record<PersonaId, Persona>` for O(1) lookup.
  - `getPersona(id: PersonaId): Persona` helper (throws on unknown id, mirroring `getMood`).
- Each record contains the 6 required fields from the `Persona` interface already defined in `src/lib/storage/types.ts` (REQ-002): `id`, `emoji`, `label`, `shortDesc`, `systemPrompt`, `sampleGreeting`.
- All user-facing copy and prompt content authored in **Korean**, with content sourced verbatim (label/emoji) or paraphrased (shortDesc/sampleGreeting/systemPrompt tone string) from PRD §3.8 and §3.8.1.
- A test-friendly export shape so REQ-004's drift-guard tests (next phase) can assert: length === 14, every `PersonaId` covered exactly once, safety-footer phrase present in every assembled `systemPrompt`, persona-lock guard present in every assembled `systemPrompt`, shaman's no-fortune-telling guard present, no `{userName}` or other unresolved placeholders in any field.

## Out of Scope (deferred to owner REQ)

- **Persona picker UI / `PersonaIcon` component** → REQ-016 (모드 B 페르소나 선택 모달). REQ-016 consumes `PERSONAS` to render the grid and decides icon styling and big-tile layout itself.
- **`buildSystemPrompt(persona, diaryCorpus)` (corpus interpolation, message-list assembly, OpenAI call)** → REQ-017 (모드 C 활성 세션 + LLM 호출 플로우). REQ-004 stops at the persona-side prompt; REQ-017 owns the wrapper that appends `{diaries_serialized}` and any future message-level scaffolding.
- **Past-conversation read-only enforcement** → REQ-018 (모드 D). Pure UI concern; persona data is identical.
- **User-customizable honorifics** (e.g. user picks "오빠" for sibling, custom child name for mother) → v2 per PRD §13.2. REQ-004 hardcodes the PRD defaults (sibling="언니", mother="우리 아이").
- **Per-persona LLM model routing** (e.g. king → bigger model) → v2 per PRD §4.6.7. REQ-004 carries no model field.
- **Hand-painted illustration assets** for personas — emoji is the placeholder per PRD §3.8 table. Asset swap is a later REQ analogous to MoodIcon replacement.
- **Settings-level "default persona"** field on `Settings` → declaration-merge in whatever REQ exposes the setting; not REQ-004's concern.

## Invariants

1. **Persona count is exactly 14**, with ids matching the `PersonaId` union (`friend | lover | sibling | employee | boss | king | grandma | therapist | daoist | shaman | junior | senior | mother | father`) — no missing id, no extra id, no duplicates. Enforced both by `satisfies readonly Persona[]` at compile time and by a length/coverage test at runtime.
2. **PRD §3.8 row fidelity**: for every persona the `id`, `emoji`, and `label` columns match the PRD table verbatim. `shortDesc` reads as a faithful one-line summary of the PRD "한 줄 설명" column. `sampleGreeting` is a Korean opener whose tone matches the PRD "예시 응답 톤" column (e.g. friend: "오 그날 진짜 빡쳤겠다 ㅠㅠ 무슨 일 있었어?").
3. **Every assembled `systemPrompt` contains, in Korean:**
   - the §3.8.1 common-base rules (diary-facts-only, cite dates, admit when absent),
   - the persona-specific tone paragraph from §3.8.1,
   - the §4.6.8 persona-lock guard (the exact user-facing refusal sentence "이 대화의 톤은 시작 시 정해져 있어요. 다른 톤을 원하시면 새 대화를 시작해주세요" must be reproducible from the prompt),
   - the §3.8 safety footer "단, 사용자를 존중하는 선을 항상 지킬 것".
4. **Shaman-specific guard**: `shaman.systemPrompt` additionally contains the no-fortune-telling / no-anxiety-inducing constraint from §3.8.1 ("점괘로 미래를 단정하거나 불안을 조성하지 말 것 — 어디까지나 캐릭터 연기").
5. **Honorific defaults are concrete strings, not template tokens**: no unresolved `{userName}`, `{honorific}`, etc. survive into the stored `systemPrompt`. sibling uses "언니", mother uses "우리 아이" as the default address, in line with PRD §3.8.1.
6. **No `{diaries_serialized}` placeholder lives in `systemPrompt`.** The diary corpus is REQ-017's responsibility; REQ-004's `systemPrompt` ends at the safety footer.
7. **All user-facing strings are Korean.** English is allowed only in code identifiers, JSDoc, and the literal `PersonaId` enum values.
8. **Iteration order of `PERSONAS` is stable and meaningful** — pick a deterministic order (PRD §3.8 table order: friend → lover → sibling → junior → senior → employee → boss → king → mother → father → grandma → therapist → daoist → shaman) so REQ-016's picker grid renders predictably without re-sorting.
9. **Drift guard for the safety footer / persona-lock guard**: if the canonical phrase changes, the test must fail loudly, not silently lose the guard on one persona.

## Open Questions and Recommended Defaults

1. **File location.** Where does the master data live?
   **Recommendation:** `src/design-system/personas.ts`, parallel to `src/design-system/moods.ts`. Same import shape (`import type { Persona, PersonaId } from '@/lib/storage'`), same `satisfies readonly Persona[]` pattern, same `PERSONAS` + `PERSONA_MAP` + `getPersona` triplet. Reusing the moods module's layout costs nothing and gives REQ-016 a predictable mental model. **Note:** the 100-line file rule has an explicit exception for constant tables (CLAUDE.md "File size & responsibility rule"); the 14-persona table with full Korean `systemPrompt` strings will exceed 100 lines and that is acceptable. If the assembled prompts push the file past ~300 lines, split the per-persona tone strings into a sibling `personas.prompts.ts` and keep `personas.ts` as the assembler — but do this only if it actually crosses that threshold.

2. **`systemPrompt` field semantics — tone-only string vs. fully-assembled prompt.** Two strategies:
   - (a) Store the **persona-specific tone string only** in `systemPrompt`; have REQ-017's `buildSystemPrompt(persona, diaryCorpus)` assemble `base + tone + lockGuard + footer + corpus` at call time.
   - (b) Store the **fully-assembled prompt minus the diary corpus** in `systemPrompt`; REQ-017 only appends the corpus.

   **Recommendation: (b) — fully-assembled prompt minus diary corpus.**
   Rationale:
   - The `Persona` interface JSDoc already says "Injected into the LLM system prompt (PRD §3.8.1 template)" and PRD §3.7 describes it as "LLM 호출 시 system prompt에 주입". The natural reading is "this string is what gets injected", i.e. the assembled prompt.
   - It keeps REQ-004's drift-guard tests self-contained: a single `expect(persona.systemPrompt).toContain(SAFETY_FOOTER)` per persona, with no test-time assembly.
   - It collapses the API surface that REQ-017 has to learn — REQ-017's wrapper becomes a one-liner (`${persona.systemPrompt}\n\n[사용자 일기 데이터]\n${corpus}`), which lowers the risk of the wrapper accidentally dropping the safety footer in a refactor.
   - Future evolution (e.g. moving the base/footer into a dynamic builder) is a refactor — declaration-merge `Persona`, add a `tone` field, recompute `systemPrompt`. No data is lost; it's mechanical.

   Trade-off acknowledged: (b) duplicates the common base + footer 14 times in source. We accept this in exchange for the guarantees above, and we contain the duplication by **building `systemPrompt` at module load** from a single `COMMON_BASE`, `PERSONA_LOCK_GUARD`, `SAFETY_FOOTER` constants plus the per-persona tone string, rather than literally typing the base into 14 string literals. That is the technical-design-agent's call to formalize in Phase 5.

3. **Where the common-base + safety footer live** (given strategy (b)): inline-duplicated in 14 literal strings, or single constants composed at module load?
   **Recommendation:** single `COMMON_BASE`, `PERSONA_LOCK_GUARD`, `SAFETY_FOOTER` constants composed at module load via a small `assemble(tone, extra?)` helper inside `personas.ts`. The exported `Persona.systemPrompt` value is the fully-assembled string (satisfying strategy (b)), but the **source** has one canonical copy of each invariant phrase. Pair with a drift-guard test that asserts every persona's `systemPrompt` literally contains each canonical constant.

4. **Honorific placeholders — substitute now or leave a token?** PRD §3.8.1 mentions "호칭 기본값은 사용자 이름(없으면 '우리 아이')" for mother, "언니" for sibling, etc. Should `systemPrompt` carry `{userName}` for REQ-017 to substitute?
   **Recommendation:** **hardcode the defaults in `systemPrompt`** for MVP. PRD §13.2 explicitly lists 호칭 사용자 설정 as v2. Carrying a `{userName}` token now requires either (a) shipping substitution logic in REQ-017 that nothing actually drives, or (b) leaving an unresolved token in production prompts on day one. Hardcoded defaults match what the LLM will say to a real user today and keep invariant #5 enforceable by a simple "no curly-brace tokens" regex test.

5. **`getPersona` behavior on unknown id — throw or return `undefined`?**
   **Recommendation:** **throw**, mirroring `getMood` in `src/design-system/moods.ts` exactly. Same JSDoc shape ("only reachable if the caller bypasses TypeScript"). Symmetry with REQ-003 is worth more than the marginal flexibility of `undefined`.

6. **Export shape — `PERSONAS` array, `PERSONA_MAP`, both, or just one?**
   **Recommendation:** **both**, identical to REQ-003. `PERSONAS` for ordered iteration (picker grid in REQ-016, future stats panel). `PERSONA_MAP` for O(1) lookup behind `getPersona` and for any consumer that already holds a `PersonaId`.

7. **Should REQ-004 ship a `PersonaIcon` component now, parallel to `MoodIcon`?**
   **Recommendation: no.** PRD §4.6.4 describes the persona picker as big emoji + label tiles, not the small badge that `MoodIcon` solves. REQ-016 owns the picker layout and is the natural place to decide whether the icon is a standalone component, a `<PickerTile>` variant, or just an inline emoji. Adding a `PersonaIcon` now risks pre-committing to a shape REQ-016 will want to refactor. Defer.

## Dependency Check

- **REQ-001 (build tier + scaffold)** — DONE per `requirements/index.md`. Project is scaffolded as Option B (React 18 + Vite + Tailwind), confirmed by the existing `src/design-system/`, `src/lib/storage/`, `@/` path alias in `src/design-system/moods.ts`, and Vitest test folders under `__tests__/`.
- **REQ-002 (data model + storage layer)** — DONE. `Persona` interface and `PersonaId` union already exist verbatim in `src/lib/storage/types.ts` lines 38–70, matching PRD §3.7 exactly. REQ-004 imports the type; it does not redefine it.
- **REQ-003 (mood master + MoodIcon)** — DONE. `src/design-system/moods.ts` provides the structural template REQ-004 will mirror (`MOODS` array + `MOOD_MAP` + `getMood`, all under `src/design-system/`). Test layout in `src/design-system/__tests__/moods.test.ts` provides the template for REQ-004's drift-guard tests in Phase 8.
- No other REQ blocks REQ-004. REQ-004 unblocks REQ-016 (persona picker), REQ-017 (active chat session + LLM call), and REQ-018 (past conversation read-only).

## Verdict
PASS
