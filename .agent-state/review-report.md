# Code Review — REQ-004

## Verdict
PASS

---

## Contract Conformance

All 7 public exports are present and correctly typed:

| Export | Present | Correct type |
|---|---|---|
| `COMMON_BASE` | Yes | `string` |
| `PERSONA_LOCK_GUARD` | Yes | `string` |
| `SAFETY_FOOTER` | Yes | `string` |
| `SHAMAN_GUARD` | Yes | `string` |
| `PERSONAS` | Yes | `readonly Persona[]` (via `satisfies`) |
| `PERSONA_MAP` | Yes | `Record<PersonaId, Persona>` (one documented cast) |
| `getPersona` | Yes | `(id: PersonaId) => Persona` |

Private scope confirmed: `assemble` is a plain `function` declaration (not exported) at line 52; `PERSONA_TONES` is a `const` (not exported) at line 63. The directory has no `index.ts` barrel.

---

## Korean Text Fidelity Spot-Check

Spot-checked 4 personas against PRD §3.8.1:

**friend** — PRD: `"친한 친구처럼 반말로, 가볍고 공감적으로 답해. 농담도 살짝 섞고, 너무 진지하지 않게. '~야', '~지', '~잖아' 같은 어미 자유롭게."` — Implementation identical. PASS.

**king** — PRD: `"사극에 나오는 왕처럼 위엄 있는 고어체로 답하세요. '하노라', '~느니라', '짐이' 같은 표현 사용. 단 너무 어렵지 않게, 의미는 명확하게."` — Implementation identical. PASS.

**mother** — PRD: `"사용자를 자식처럼 대하는 따뜻한 엄마 톤. '우리 ○○이~', '아이고' 같은 호칭과 감탄사. 사랑과 잔소리(밥, 건강 등)가 자연스럽게 섞임. 호칭 기본값은 사용자 이름(없으면 '우리 아이')."` — Implementation identical, including hardcoded fallback `'우리 아이'`. PASS.

**shaman tone** — Implementation matches the non-guard portion of PRD §3.8.1. The trailing guard clause is correctly extracted into `SHAMAN_GUARD` and passed via the `assemble`'s `extra` argument. PASS.

**COMMON_BASE** — Matches PRD §3.8.1 `[공통 베이스]` + `[규칙]` block verbatim with proper `\n\n` block separator. PASS.

**PERSONA_LOCK_GUARD** — Implementation renders the two PRD §4.6.8 components into a single natural-language instruction ("사용자가 톤 변경을 요청하면 ... 라고 답하세요"). PASS.

**SAFETY_FOOTER** — `"단, 사용자를 존중하는 선을 항상 지킬 것."` verbatim. PASS.

**SHAMAN_GUARD** — `"점괘로 미래를 단정하거나 불안을 조성하지 말 것 — 어디까지나 캐릭터 연기."` verbatim. PASS.

---

## Invariant Correctness

- **Length**: `PERSONAS` array has 14 entries. PASS.
- **PRD §3.8 order**: friend → lover → sibling → junior → senior → employee → boss → king → mother → father → grandma → therapist → daoist → shaman — matches. PASS.
- **`satisfies readonly Persona[]`**: present. PASS.
- **`PERSONA_MAP` derivation**: `Object.fromEntries(PERSONAS.map(p => [p.id, p]))` — not hand-written. PASS.
- **`getPersona` error message**: `` `Unknown PersonaId: ${id}` `` matches contract exactly. PASS.
- **sibling "언니"**: present in `PERSONA_TONES.sibling`. PASS.
- **mother "우리 아이"**: present in `PERSONA_TONES.mother`. PASS.
- **No `{token}` survives**: `○○이~` and `○○님` use Korean circle notation, not curly braces. PASS.
- **SHAMAN_GUARD exclusivity**: only `assemble(PERSONA_TONES.shaman, SHAMAN_GUARD)` passes a second argument; the `if (extra !== undefined)` guard handles this correctly. PASS.

---

## CLAUDE.md Compliance

- **Working language**: all user-facing fields Korean; English only in code identifiers and comments. PASS.
- **No new devDependencies**: test file imports only from pre-existing modules. PASS.
- **One responsibility per file**: `personas.ts` = data + one helper; `personas.test.ts` = tests only. PASS.

---

## File Size and Responsibility

`personas.ts` is ~237–263 lines (reports cite slightly different counts; actual). Pure constant-table data + one trivial helper. Fits CLAUDE.md constant-table exception. No split warranted. PASS.

`personas.test.ts` is ~121–164 lines, covering 17 cases across 5 describe blocks. Test file; no hard cap. PASS.

---

## Type Safety

- No `as any`.
- The single `as Record<PersonaId, Persona>` cast on `PERSONA_MAP` derivation is the same pattern as `moods.ts` and is documented in the contract as acceptable.
- `id: 'friend' as const` (and equivalents) required because TypeScript cannot narrow string literals inside an array literal with `satisfies`. Idiomatic and correct.
- `import type { Persona, PersonaId }` correctly type-only. PASS.

---

## Test Quality

All 17 plan cases are present with exact `it()` description strings from the plan. Assertions are specific (`.toBe`, `.toEqual`, `.toContain`, `.toThrow` with exact strings). Drift-guard tests import the canonical constants from the source module — paraphrasing the source breaks the test rather than passing silently. Tests are independent. PASS.

Minor observation: test case 6 uses `PERSONAS.find(p => p.id === id)` inside a 14-id loop — O(n²) but trivially cheap and consistent with the moods.test.ts pattern.

---

## Backward Compatibility

No existing files modified. `src/lib/storage/`, `src/app/`, `vitest.config.ts`, `package.json`, `MoodIcon.tsx`, `moods.ts`, and all pre-existing test files untouched. 62 pre-existing tests continue to pass. No new runtime or devDependencies. PASS.

---

## Architecture Consistency

The module mirrors `moods.ts` in structure with high fidelity: same import style, same `satisfies readonly X[]`, same `Object.fromEntries` map derivation, same throwing getter with identical error template. Test file mirrors `moods.test.ts` structure. No barrel. PASS.

---

## Non-Blocking Suggestions

1. The `PERSONA_TONES: Record<PersonaId, string>` map gives TypeScript compile-time exhaustiveness on all 14 keys — positive design choice worth noting for future REQ authors.
2. Test file's describe-block numbering ("Block 1"–"Block 5" in comments) differs from the implementation report's block table numbering. Documentation discrepancy only; tests are correct.
3. `sampleGreeting` strings for `employee` and `boss` contain `○○님` and date examples. Downstream REQ-016 should treat `sampleGreeting` as illustrative copy, not as a template to fill. Consider adding a JSDoc note on the `sampleGreeting` field in `src/lib/storage/types.ts` when next touched.

---

## Blocking Issues

None.
