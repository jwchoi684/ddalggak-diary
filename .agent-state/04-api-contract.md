# API Contract — REQ-004

## Scope

Internal TypeScript module contract for `src/design-system/personas.ts`. This is a pure-data, pure-function module: no HTTP endpoints, no React components, no async I/O. The contract covers the public export surface, type signatures, invariants callers must rely on, and the error contract for `getPersona`. All drift-guard constants are exported so test files can `.toContain()` them without hardcoding Korean strings.

---

## Public Exports (from `@/design-system/personas`)

| Export | Kind | Type | Purpose |
|---|---|---|---|
| `COMMON_BASE` | `const` | `string` | PRD §3.8.1 common base rules injected into every systemPrompt |
| `PERSONA_LOCK_GUARD` | `const` | `string` | PRD §4.6.8 tone-lock refusal sentence injected into every systemPrompt |
| `SAFETY_FOOTER` | `const` | `string` | PRD §3.8.1 safety constraint injected into every systemPrompt |
| `SHAMAN_GUARD` | `const` | `string` | PRD §3.8.1 shaman-specific no-fortune-telling guard |
| `PERSONAS` | `const` | `readonly Persona[]` | Ordered master array, length 14, PRD §3.8 table order |
| `PERSONA_MAP` | `const` | `Record<PersonaId, Persona>` | O(1) lookup derived from `PERSONAS` at module load |
| `getPersona` | `function` | `(id: PersonaId) => Persona` | Throws on unknown id; mirrors `getMood` from `moods.ts` |

Not exported: `assemble` private helper, `PERSONA_TONES` internal map.

---

## Drift-Guard Constants

```typescript
/**
 * Common base injected at the top of every systemPrompt.
 * Source: PRD §3.8.1 [공통 베이스] + [규칙] block — copy verbatim.
 * Tests: every Persona.systemPrompt must .toContain(COMMON_BASE).
 */
export const COMMON_BASE: string;
// Value (verbatim):
// "당신은 사용자의 일기를 기반으로 답변하는 AI입니다.\n\n
//  - 일기에 기록된 사실만 근거로 답하세요. 추측하지 마세요.\n
//  - 관련 일기를 인용할 때는 날짜를 함께 언급하세요.\n
//  - 일기가 없는 사항을 물으면 솔직히 "그 부분은 일기에 없어요"라고 답하세요."

/**
 * Persona-lock guard injected after the per-persona tone block.
 * Source: PRD §4.6.8 — copy verbatim (both sentences).
 * Tests: every Persona.systemPrompt must .toContain(PERSONA_LOCK_GUARD).
 */
export const PERSONA_LOCK_GUARD: string;
// Value (verbatim):
// "이 톤을 대화 내내 유지하세요. 사용자가 톤 변경을 요청하면 "이 대화의 톤은 시작 시
//  정해져 있어요. 다른 톤을 원하시면 새 대화를 시작해주세요"라고 답하세요."

/**
 * Safety footer — final line of every systemPrompt.
 * Source: PRD §3.8.1 안전장치 block — copy verbatim.
 * Tests: every Persona.systemPrompt must .toContain(SAFETY_FOOTER).
 */
export const SAFETY_FOOTER: string;
// Value (verbatim): "단, 사용자를 존중하는 선을 항상 지킬 것."

/**
 * Shaman-specific guard inserted before SAFETY_FOOTER only for the shaman persona.
 * Source: PRD §3.8.1 shaman bullet trailing clause — copy verbatim.
 * Tests: shaman.systemPrompt must .toContain(SHAMAN_GUARD);
 *        all other 13 personas must NOT contain SHAMAN_GUARD.
 */
export const SHAMAN_GUARD: string;
// Value (verbatim): "점괘로 미래를 단정하거나 불안을 조성하지 말 것 — 어디까지나 캐릭터 연기."
```

---

## Master Data Exports

```typescript
/**
 * Ordered master array of all 14 personas (PRD §3.8 table order):
 *   friend → lover → sibling → junior → senior → employee → boss → king
 *   → mother → father → grandma → therapist → daoist → shaman
 *
 * Invariants:
 *   - PERSONAS.length === 14
 *   - Every PersonaId literal appears exactly once
 *   - Array order is stable and matches PRD §3.8 display order
 *   - Every systemPrompt is fully assembled at module load (no deferred eval)
 *   - No field in any record contains an unresolved {token}
 *   - All user-facing strings are Korean
 */
export const PERSONAS: readonly Persona[];   // satisfies readonly Persona[]

/**
 * Record<PersonaId, Persona> derived from PERSONAS via Object.fromEntries.
 * O(1) lookup. Returns undefined for any key not in PersonaId union.
 *
 * Implementation: Object.fromEntries(PERSONAS.map(p => [p.id, p])) as Record<PersonaId, Persona>
 */
export const PERSONA_MAP: Record<PersonaId, Persona>;
```

---

## Helper Function

```typescript
/**
 * Returns the Persona record for the given PersonaId.
 *
 * @param id - A PersonaId literal. TypeScript enforces this at call sites.
 * @returns    The matching Persona record (same reference as PERSONA_MAP[id]).
 * @throws {Error} `Unknown PersonaId: ${id}` — only reachable if the caller
 *                  bypasses TypeScript.
 *
 * @example
 *   const p = getPersona('shaman');
 *   // p.systemPrompt contains SHAMAN_GUARD
 */
export function getPersona(id: PersonaId): Persona;
```

Assembly template (private `assemble` helper):

```typescript
// Standard 13: `${COMMON_BASE}\n\n${tone}\n\n${PERSONA_LOCK_GUARD}\n\n${SAFETY_FOOTER}`
// Shaman:      `${COMMON_BASE}\n\n${tone}\n\n${PERSONA_LOCK_GUARD}\n\n${SHAMAN_GUARD}\n\n${SAFETY_FOOTER}`
```

---

## Error Contract Summary Table

| Situation | Behavior | Error message |
|---|---|---|
| `getPersona` called with valid `PersonaId` | Returns `Persona` record | — |
| `getPersona` called with unknown id (TS bypass) | Throws `Error` synchronously | `"Unknown PersonaId: ${id}"` |
| `PERSONA_MAP[unknownKey]` | Returns `undefined` (caller must guard) | — |
| Module load (import) | Always synchronous; never throws | — |
| Any drift-guard constant | Read-only `string`; never throws | — |

---

## Caller Invariants

- `PERSONAS.length` is guaranteed to be `14` at runtime.
- The 14 ids in `PERSONAS` are exactly the 14 members of the `PersonaId` union — one each, no duplicates.
- `PERSONAS` iteration order is stable and matches the PRD §3.8 table (friend first, shaman last). Do not re-sort for display.
- `getPersona(id)` returns `PERSONA_MAP[id]` by reference — callers may use `===` identity.
- Every `systemPrompt` contains `COMMON_BASE`, `PERSONA_LOCK_GUARD`, and `SAFETY_FOOTER` as literal substrings.
- `shaman.systemPrompt` additionally contains `SHAMAN_GUARD` as a literal substring; no other persona's `systemPrompt` does.
- No field of any `Persona` record matches `/\{[^}]+\}/` — there are no unresolved template tokens.
- `sibling.systemPrompt` uses the hardcoded honorific "언니" (not a `{honorific}` token).
- `mother.systemPrompt` uses the hardcoded address "우리 아이" (not a `{userName}` token).
- `systemPrompt` does not contain `{diaries_serialized}` or any corpus placeholder — diary-corpus injection is REQ-017's responsibility.
- All construction is synchronous at module load.

---

## Import Path Discipline

| What to import | From |
|---|---|
| `Persona`, `PersonaId` types | `'@/lib/storage'` (re-exported from `src/lib/storage/index.ts`) |
| `PERSONAS`, `PERSONA_MAP`, `getPersona`, drift-guard constants | `'@/design-system/personas'` (direct per-file import) |

Rules:
- There is no barrel at `src/design-system/index.ts`. Import directly from `@/design-system/personas`.
- Do not re-export `Persona` or `PersonaId` from `personas.ts`. Types are owned by `@/lib/storage`.
- REQ-017 imports `getPersona` or `PERSONA_MAP` and reads `persona.systemPrompt` directly; it does not re-assemble from the drift-guard constants.

---

## Out of Scope

| Item | Owner REQ |
|---|---|
| `PersonaIcon` component / persona picker tile UI | REQ-016 |
| `buildSystemPrompt(persona, diaryCorpus)` — corpus injection + OpenAI call wrapper | REQ-017 |
| Past-conversation read-only enforcement | REQ-018 |
| User-customizable honorifics (e.g. user sets "오빠" for sibling) | v2, PRD §13.2 |
| Per-persona LLM model routing | v2, PRD §4.6.7 |
| Hand-painted illustration assets (persona portrait swap) | Future REQ |
| `Settings.defaultPersona` field | Declaration-merge by whatever REQ exposes the setting |

---

## Verdict
PASS
