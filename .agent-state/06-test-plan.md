# Test Plan — REQ-004

## Summary

REQ-004 delivers `src/design-system/personas.ts`: a pure-data, pure-function module
exposing 14 `Persona` records, a `PERSONA_MAP`, a `getPersona()` helper, and four
drift-guard string constants. There is no HTTP, no React component, and no async I/O.
The single test file mirrors the `moods.test.ts` pattern already in the codebase.

---

## Runtime & Config

- **Test runner**: Vitest, global `environment: 'node'` (existing `vitest.config.ts` — unchanged).
- **Path alias**: `@` → `src/` (already configured).
- **No new devDependencies** required.
- **Test file**: `src/design-system/__tests__/personas.test.ts`

---

## Unit Tests

### `src/design-system/__tests__/personas.test.ts` — node env, ~17 cases

#### Block 1: Data integrity

```
describe('PERSONAS master data')
```

1. `it('has exactly 14 entries')` — `expect(PERSONAS.length).toBe(14)`
2. `it('PERSONAS order matches PRD §3.8 sequence')` — `expect(PERSONAS.map(p => p.id)).toEqual(EXPECTED_IDS)` where `EXPECTED_IDS` is `['friend','lover','sibling','junior','senior','employee','boss','king','mother','father','grandma','therapist','daoist','shaman']`
3. `it('contains every PersonaId literal exactly once — no duplicates')` — build `Set` from ids; assert `idSet.size === 14` and every element of `EXPECTED_IDS` is present
4. `it('every required Persona field is a non-empty string for all records')` — loop `PERSONAS`; for each record assert `id`, `emoji`, `label`, `shortDesc`, `systemPrompt`, `sampleGreeting` all have `length > 0`

```
describe('PERSONA_MAP')
```

5. `it('has exactly 14 keys, all valid PersonaId values')` — `expect(Object.keys(PERSONA_MAP).length).toBe(14)`; assert every key is in `EXPECTED_IDS`
6. `it('PERSONA_MAP[id] is the same reference as the matching PERSONAS entry')` — loop 14 ids; `expect(PERSONA_MAP[id]).toBe(PERSONAS.find(p => p.id === id))`

#### Block 2: Helper function

```
describe('getPersona')
```

7. `it('returns the friend record as a spot check')` — `expect(getPersona('friend')).toBe(PERSONA_MAP['friend'])`
8. `it('does not throw for all 14 valid ids')` — loop `EXPECTED_IDS`; `expect(() => getPersona(id)).not.toThrow()`
9. `it('throws "Unknown PersonaId: <id>" for an unrecognised id')` — `expect(() => getPersona('not-a-real-id' as unknown as PersonaId)).toThrow('Unknown PersonaId: not-a-real-id')`

#### Block 3: Drift-guard

```
describe('system prompt drift guard')
```

10. `it('every systemPrompt contains COMMON_BASE')` — loop `PERSONAS`; `expect(p.systemPrompt).toContain(COMMON_BASE)`
11. `it('every systemPrompt contains PERSONA_LOCK_GUARD')` — loop `PERSONAS`; `expect(p.systemPrompt).toContain(PERSONA_LOCK_GUARD)`
12. `it('every systemPrompt contains SAFETY_FOOTER')` — loop `PERSONAS`; `expect(p.systemPrompt).toContain(SAFETY_FOOTER)`
13. `it('only shaman systemPrompt contains SHAMAN_GUARD; all others do not')` — assert `PERSONA_MAP.shaman.systemPrompt` contains `SHAMAN_GUARD`; loop the 13 non-shaman personas and assert each does NOT contain `SHAMAN_GUARD`
14. `it('no field of any persona contains an unresolved {token}')` — for every persona, for each of `['emoji','label','shortDesc','systemPrompt','sampleGreeting']`, assert the field value does not match `/\{[^}]+\}/`

#### Block 4: Honorific defaults

```
describe('honorific defaults')
```

15. `it('sibling systemPrompt uses hardcoded honorific "언니"')` — `expect(PERSONA_MAP.sibling.systemPrompt).toContain('언니')`
16. `it('mother systemPrompt uses hardcoded address "우리 아이"')` — `expect(PERSONA_MAP.mother.systemPrompt).toContain('우리 아이')`

#### Block 5: Korean language smoke

```
describe('Korean language labels')
```

17. `it('king label is "왕" and shaman label is "무당" — no accidental English leak')` — `expect(PERSONA_MAP.king.label).toBe('왕')` and `expect(PERSONA_MAP.shaman.label).toBe('무당')`

**Total: 17 `it()` cases.**

---

## Integration Tests

Not applicable. The module has no I/O, no network calls, and no external dependencies.
All state is constructed synchronously at import time; unit tests fully cover the contract.

---

## E2E Tests

Not applicable. No UI component is delivered in this REQ. E2E coverage deferred to
REQ-016 (persona picker) and REQ-017 (AI chat session start).

---

## Regression Tests

The existing `moods.test.ts` suite is not modified. Running `npm test` exercises both
suites in parallel and confirms no regressions in the mood module.

---

## Security-Relevant Tests

- Case 14 (no `{token}` in any field) guards against accidental template-injection
  vectors — a surviving `{diaries_serialized}` placeholder could mislead callers into
  sending user data in the wrong slot of the OpenAI request.
- Case 13 (SHAMAN_GUARD exclusivity) ensures the no-fortune-telling safety clause
  is not accidentally injected into other personas where it has no context.

---

## Fixtures / Mocks Needed

None. The module is pure synchronous data. The test file imports directly:

```typescript
import type { PersonaId } from '@/lib/storage';
import {
  PERSONAS, PERSONA_MAP, getPersona,
  COMMON_BASE, PERSONA_LOCK_GUARD, SAFETY_FOOTER, SHAMAN_GUARD,
} from '@/design-system/personas';
```

No `vi.mock`, no `localStorage` setup, no additional setup files beyond the existing
global `setup.ts` already wired in `vitest.config.ts`.

---

## Commands to Run

```bash
npm run typecheck
npm run lint
npm test
```

---

## Coverage Matrix

| Caller Invariant (from `04-api-contract.md`) | Covering test case(s) |
|---|---|
| `PERSONAS.length === 14` | Case 1 |
| 14 ids are exactly the `PersonaId` union members, no duplicates | Cases 2, 3 |
| `PERSONAS` order stable, matches PRD §3.8 (friend first, shaman last) | Case 2 |
| `getPersona(id)` returns `PERSONA_MAP[id]` by reference | Cases 6, 7 |
| Every `systemPrompt` contains `COMMON_BASE` | Case 10 |
| Every `systemPrompt` contains `PERSONA_LOCK_GUARD` | Case 11 |
| Every `systemPrompt` contains `SAFETY_FOOTER` | Case 12 |
| `shaman.systemPrompt` contains `SHAMAN_GUARD`; all others do not | Case 13 |
| No field matches `/\{[^}]+\}/` (no unresolved tokens) | Case 14 |
| `sibling.systemPrompt` uses hardcoded "언니" | Case 15 |
| `mother.systemPrompt` uses hardcoded "우리 아이" | Case 16 |
| `getPersona` throws `"Unknown PersonaId: ${id}"` on unknown id | Case 9 |
| `PERSONA_MAP` has 14 keys, all valid `PersonaId` values | Case 5 |
| Module load is always synchronous; never throws | Cases 1–8 (all exercise import-time state) |
| All user-facing strings are Korean | Cases 4 (non-empty), 17 (spot-check labels) |

---

## Not Applicable Tests

| Category | Reason |
|---|---|
| React component tests | No component delivered in REQ-004 |
| happy-dom / jsdom env | Vitest env is `node`; no DOM required |
| HTTP / network mocking | No async I/O in this module |
| E2E browser tests | No UI surface; deferred to REQ-016/017 |
| Performance benchmarks | Module load is O(1) string concat x14; trivial |
| Database / migration | No persistence layer touched |

---

## Verdict
PASS
