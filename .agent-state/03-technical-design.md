# Technical Design — REQ-004

## Goal

Deliver `src/design-system/personas.ts` — the single master-data module that exposes 14 `Persona` records (one per `PersonaId`), derived `PERSONA_MAP`, `getPersona(id)` helper, and named drift-guard constants so downstream REQs and tests can import everything from one location without knowing about assembly internals.

## File Layout

```
src/design-system/
  personas.ts                   ← new (200–350 lines; constant-table exception applies)
  __tests__/
    personas.test.ts            ← new (~80 lines)
```

No other files change. `src/lib/storage/types.ts` is read-only; `Persona` and `PersonaId` are already defined there.

If the file exceeds ~350 lines after the implementer writes out all Korean tone strings, split tone strings into a sibling file `src/design-system/persona-tones.ts` and import from it — but do not pre-split; let the line count drive the decision.

## Constants (verbatim Korean text from PRD)

### COMMON_BASE
Source: PRD §3.8.1 `[공통 베이스]` + `[규칙]` block. The implementer must copy verbatim:

```
당신은 사용자의 일기를 기반으로 답변하는 AI입니다.

- 일기에 기록된 사실만 근거로 답하세요. 추측하지 마세요.
- 관련 일기를 인용할 때는 날짜를 함께 언급하세요.
- 일기가 없는 사항을 물으면 솔직히 "그 부분은 일기에 없어요"라고 답하세요.
```

### PERSONA_LOCK_GUARD
Source: PRD §4.6.8. The implementer must include both sentences verbatim:

```
이 톤을 대화 내내 유지하세요. 사용자가 톤 변경을 요청하면 "이 대화의 톤은 시작 시 정해져 있어요. 다른 톤을 원하시면 새 대화를 시작해주세요"라고 답하세요.
```

### SAFETY_FOOTER
Source: PRD §3.8.1 안전장치 block (verbatim):

```
단, 사용자를 존중하는 선을 항상 지킬 것.
```

### SHAMAN_GUARD
Source: PRD §3.8.1 shaman bullet trailing clause (verbatim):

```
점괘로 미래를 단정하거나 불안을 조성하지 말 것 — 어디까지나 캐릭터 연기.
```

All four must be exported named constants so tests can `.toContain()` them without hardcoding the strings in test files.

## Assembly Function

A private helper `assemble(tone: string, extra?: string): string` builds the fully-assembled `systemPrompt` at module load time. It is not exported.

Standard template (13 personas):
```
{COMMON_BASE}\n\n{tone}\n\n{PERSONA_LOCK_GUARD}\n\n{SAFETY_FOOTER}
```

Shaman template (1 persona, `extra = SHAMAN_GUARD`):
```
{COMMON_BASE}\n\n{tone}\n\n{PERSONA_LOCK_GUARD}\n\n{SHAMAN_GUARD}\n\n{SAFETY_FOOTER}
```

The diary corpus (`{diaries_serialized}`) is NOT included here — that is REQ-017's responsibility.

## Per-Persona Tone Strings (PRD subsection mapping)

The implementer extracts the following from PRD §3.8.1 `페르소나별 systemPrompt 내용 (예시)` verbatim. This table maps each persona to its source bullet.

| Order | id | emoji | label | Tone source (PRD §3.8.1 bullet) | sampleGreeting source (PRD §3.8 table) | Extra guard |
|---|---|---|---|---|---|---|
| 1 | friend | 👯 | 친구 | `friend` bullet | 오 그날 진짜 빡쳤겠다 ㅠㅠ 무슨 일 있었어? | — |
| 2 | lover | 💕 | 연인 | `lover` bullet | 자기야, 그날 많이 힘들었구나. 옆에 있어줬어야 했는데... | — |
| 3 | sibling | 🧒 | 동생 | `sibling` bullet (호칭 기본값: 언니) | 언니~ 그때 그렇게 슬펐어? 나도 막 같이 울고싶다 ㅠㅠ | — |
| 4 | junior | 🙋 | 후배 | `junior` bullet | 선배님! 그날 많이 힘드셨겠어요. 제가 뭐라도 도울 게 있었으면 좋았을 텐데요 ㅠㅠ | — |
| 5 | senior | 😎 | 선배 | `senior` bullet | 오~ 그때 슬펐구나. 살다 보면 그런 날도 있는 거지. 내가 경험상 말해주는데, 그런 감정은 흘려보내야 해. | — |
| 6 | employee | 🧑‍💼 | 부하 직원 | `employee` bullet | ○○님, 해당 일자 일기를 확인해드렸습니다. 참고하실 내용 정리해드리겠습니다. | — |
| 7 | boss | 👔 | 상사 | `boss` bullet | 5월 13일에 슬픔으로 기록돼 있군. 원인을 정리해서 가져와봐. | — |
| 8 | king | 👑 | 왕 | `king` bullet | 그대가 5월 13일에 슬픔에 잠겼다 하노라. 짐이 그 연유를 살펴보았느니라. | — |
| 9 | mother | 🤱 | 어머니 | `mother` bullet (호칭 기본값: 우리 아이) | 아이고 우리 ○○이~ 그날 그렇게 힘들었어? 엄마한테 말하지 그랬어. 밥은 잘 챙겨먹고 있어? | — |
| 10 | father | 👨‍🦳 | 아버지 | `father` bullet | 5월 13일에 힘들었구나. 그래, 살다 보면 그런 날도 있지. 잘 견뎌냈다. | — |
| 11 | grandma | 👵 | 할머니 | `grandma` bullet | 아이고 우리 강아지~ 그날 그렇게 힘들었구나. 할미가 안아줄까~ | — |
| 12 | therapist | 🧘 | 심리상담사 | `therapist` bullet | 5월 13일에 슬픔을 느끼셨군요. 그 감정이 지금도 남아있나요? | — |
| 13 | daoist | 🧙 | 도사 | `daoist` bullet | 그대의 마음에 흐름이 일고 있느니라. 5월 13일의 슬픔도 자연의 한 자락이라네. | — |
| 14 | shaman | 🔮 | 무당 | `shaman` bullet (before the guard clause) | 어머~ 5월 13일에 살이 끼었네! 그날 슬픈 일은 액운이 지나간 거였어. 다음 주엔 좋은 일 있을 거야~ | SHAMAN_GUARD |

Notes for the implementer:
- `sibling` tone string must include the hardcoded default "언니" (not a `{honorific}` token).
- `mother` tone string must state the default address as "우리 아이" (not `{userName}`).
- `shaman` tone string is the `shaman` bullet body only, without the trailing `— 어디까지나 캐릭터 연기` clause (that clause becomes `SHAMAN_GUARD` and is appended separately).
- No curly-brace template tokens may remain in any field of any persona record.

## Public API

```typescript
import type { Persona, PersonaId } from '@/lib/storage';

// Drift-guard constants — exported for tests
export const COMMON_BASE: string;
export const PERSONA_LOCK_GUARD: string;
export const SAFETY_FOOTER: string;
export const SHAMAN_GUARD: string;

// Ordered master array — PRD §3.8 table order
export const PERSONAS: readonly Persona[];   // satisfies readonly Persona[]

// O(1) lookup map
export const PERSONA_MAP: Record<PersonaId, Persona>;

// Lookup helper — throws on unknown id
export function getPersona(id: PersonaId): Persona;
// throws: Error(`Unknown PersonaId: ${id}`)
```

`PERSONA_MAP` is derived via `Object.fromEntries(PERSONAS.map(p => [p.id, p])) as Record<PersonaId, Persona>`, mirroring `moods.ts` exactly.

`getPersona` mirrors `getMood`: look up in `PERSONA_MAP`, throw if falsy.

## Module Structure Recommendation: `PERSONA_TONES` map vs inline constants

Use a `PERSONA_TONES: Record<PersonaId, string>` map defined above the `PERSONAS` array, rather than 14 separate `const friendTone = "..."` variables. Rationale:

- A map makes the "one tone per persona" invariant visible in structure — a missing key is trivially spotted.
- It uses the `PersonaId` as the key, so TypeScript catches typos at compile time if typed as `Record<PersonaId, string>`.
- It keeps the module's top section as four named constants + one map, rather than 18 top-level names.
- The `assemble(tone, extra?)` helper then becomes a one-liner call in the `PERSONAS` array literal.

## Implementation Order

1. Copy the four Korean constant strings from PRD §3.8.1 into `COMMON_BASE`, `PERSONA_LOCK_GUARD`, `SAFETY_FOOTER`, `SHAMAN_GUARD`.
2. Write `assemble(tone, extra?)` private helper.
3. Write `PERSONA_TONES: Record<PersonaId, string>` with all 14 tone strings from §3.8.1.
4. Write `PERSONAS` array in PRD §3.8 order using `satisfies readonly Persona[]`. Each `systemPrompt` is `assemble(PERSONA_TONES[id])` (or `assemble(PERSONA_TONES.shaman, SHAMAN_GUARD)` for shaman).
5. Derive `PERSONA_MAP` via `Object.fromEntries`.
6. Write `getPersona`.
7. Write `personas.test.ts`: data-integrity block + drift-guard block. No new devDependencies.
8. Run `npm test`, `npm run typecheck`, `npm run lint`. Fix any issues.

## Test Design

Test file: `src/design-system/__tests__/personas.test.ts`. Environment: `node` (global Vitest config). No happy-dom. No new devDeps.

### Data integrity block
- `PERSONAS.length === 14`
- Every `PersonaId` literal appears in `PERSONAS` exactly once
- `PERSONAS` order matches the PRD §3.8 table order exactly
- `PERSONA_MAP` has exactly 14 keys, all valid `PersonaId` values
- `getPersona(id)` returns the same reference as `PERSONA_MAP[id]` for each of the 14 ids
- `getPersona('not-a-real-id' as PersonaId)` throws with message matching `'Unknown PersonaId'`

### Drift-guard block
- For every persona: `systemPrompt` contains `COMMON_BASE` (`.toContain`)
- For every persona: `systemPrompt` contains `PERSONA_LOCK_GUARD` (`.toContain`)
- For every persona: `systemPrompt` contains `SAFETY_FOOTER` (`.toContain`)
- Only shaman: `systemPrompt` contains `SHAMAN_GUARD`; all other 13 personas do NOT contain `SHAMAN_GUARD`
- For every persona: no field matches `/\{[^}]+\}/` — no unresolved curly-brace tokens

## Files Expected to Change

- **New**: `src/design-system/personas.ts`
- **New**: `src/design-system/__tests__/personas.test.ts`
- No existing files are modified.

## Backward Compatibility

No existing code references `personas.ts` or `PERSONAS` — consumers (REQ-016, 017, 018) don't exist yet.

## Performance Considerations

All data is constructed once at module load. `PERSONA_MAP` gives O(1) lookup. `assemble()` runs 14 times at initialization (string concatenation) — negligible. No async work.

## Infra / Deployment Considerations

None. Pure static data module.

## Risks and Tradeoffs

1. **Verbatim phrase extraction from PRD** — Medium risk. Implementer must copy Korean text from PRD §3.8.1 without paraphrase. Any paraphrase breaks the drift-guard test. Mitigation: tests import canonical constants and use `.toContain`.
2. **File length exceeding 350 lines** — Low risk if tone strings stay concise. Split at implementation time if needed.
3. **Order drift between `PersonaId` union and `PERSONAS` array** — `satisfies` checks membership but not order; the order test is the sole enforcement.
4. **Honorific token leakage** — PRD §3.8.1 uses `{...}` placeholder notation in prose. Implementer must resolve to hardcoded defaults. Mitigation: no-curly-brace regex test catches survival.

## Open Questions

None blocking. All intake decisions ratified:
- Strategy (b): fully-assembled prompt minus diary corpus — confirmed.
- `PERSONA_TONES` map structure — confirmed.
- `getPersona` throws on unknown id — confirmed.
- No `PersonaIcon` component in this REQ — confirmed (deferred to REQ-016).

## Verdict
PASS
