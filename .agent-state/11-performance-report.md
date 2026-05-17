# Performance Review — REQ-004

## Summary

REQ-004 introduces `src/design-system/personas.ts`, a pure static data module. It has no async I/O, no React component, and no runtime query. All cost is paid once at module initialisation. No blocking performance issues exist.

## Scope

- `src/design-system/personas.ts` (264 lines, 12,600 bytes UTF-8)
- API contract: `.agent-state/04-api-contract.md`
- Code review: `.agent-state/09-code-review-report.md`

Downstream consumers considered: REQ-016 (persona picker UI, 14-item list) and REQ-017 (LLM call builder, reads `persona.systemPrompt` per call).

## Findings

### 1. Module-load cost — Info

`assemble()` is called 14 times during module initialisation (13 standard, 1 shaman). Each call does 4–5 string concatenations via `Array.join`. Total work: ~14 small string joins on strings of 24–139 characters each. The fully assembled `systemPrompt` per persona is 338–390 characters. Negligible; happens exactly once per process lifetime (module singleton).

`PERSONA_MAP` is built via `Object.fromEntries(PERSONAS.map(...))` — 14 iterations. O(14) with zero heap pressure.

### 2. systemPrompt token cost per LLM call — Low / Info

Measured character lengths:

| Segment | Characters |
|---|---|
| COMMON_BASE | 139 |
| Tone string (range across 14 personas) | 68–184 |
| PERSONA_LOCK_GUARD | 90 |
| SHAMAN_GUARD (shaman only) | 42 |
| SAFETY_FOOTER | 24 |
| Separators (4 × `\n\n`) | 8 |

Assembled systemPrompt per persona: **338–390 characters**.

Estimated tokenization (~3 chars/token for Korean-heavy mixed text in GPT-4o-mini):
- Standard 13 personas: ~**113 tokens** per system prompt
- Shaman: ~**130 tokens**

Fixed baseline cost added to every LLM call. The variable diary corpus injected by REQ-017 will dominate total token cost. At 1,000 calls/day, ~113K–130K tokens/day of fixed prompt overhead = ~**$0.02/day** at GPT-4o-mini pricing — negligible.

### 3. PERSONAS iteration at REQ-016 picker — Info

REQ-016 will iterate the 14-element `PERSONAS` array to render the picker. Trivially cheap. No memoization needed for the array itself — `PERSONAS` is a module-level constant with a stable reference.

### 4. Bundle size delta — Info

| Measure | Value |
|---|---|
| Source file (UTF-8 raw) | 12,600 bytes |
| Estimated compiled JS (types stripped, comments removed) | ~4–5 KB |
| Estimated minified + gzipped client-bundle delta | ~1.5–2 KB |

### 5. getPersona vs PERSONA_MAP — Documentation gap (Low)

`getPersona(id)` delegates to `PERSONA_MAP[id]` and adds a throw guard for unknown ids. The throw is unreachable at TypeScript-typed call sites. For REQ-017's hot path (called once per LLM invocation), using `PERSONA_MAP[id]` directly avoids the null check. The difference in real execution time is sub-microsecond and immeasurable, but the pattern is worth documenting for REQ-017 authors as stylistic guidance — consistent with the API contract note that REQ-017 should read `persona.systemPrompt` directly.

Mirrors the `getMood` vs `MOOD_MAP` parallel established by `moods.ts`. Both getters exist for defensive validation at trust boundaries (e.g., persona id from `localStorage`), not for internal hot paths.

## Capacity Math

| Metric | Value |
|---|---|
| systemPrompt tokens per LLM call (baseline) | 113–130 tokens |
| Diary corpus token contribution | Variable; dominates at scale |
| Token cost per 1,000 calls (system prompt only) | ~113K–130K tokens (~$0.02 at current pricing) |
| PERSONAS iterations per picker render | 14 |
| PERSONA_MAP lookups per LLM call | 1 |
| Module-init string joins | 14 |
| Bundle delta (gzipped) | ~1.5–2 KB |

## Recommendations Mapped to Owner REQ

**REQ-017** (LLM call builder):
- Use `PERSONA_MAP[id]` for the hot path lookup rather than `getPersona(id)`.
- Token-cost monitoring for the system-prompt baseline belongs in REQ-017's observability scope. Log `prompt_tokens` from OpenAI response in dev/debug mode.
- REQ-017 must not re-assemble the systemPrompt from drift-guard constants — read `persona.systemPrompt` directly (per API contract).

**REQ-016** (persona picker):
- May iterate `PERSONAS` directly without `useMemo`.
- `sampleGreeting` strings for `employee` and `boss` contain `○○님` Korean circle notation; REQ-016 must render these as illustrative copy, not attempt token substitution.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. When REQ-017 lands, add a single `console.debug` (dev-only) log printing the resolved persona id and assembled system prompt character length. Visibility against unexpected prompt growth.
2. If the persona list ever grows beyond 14 (v2+), the `Object.fromEntries` pattern remains O(n) at init / O(1) at lookup — no architecture change up to hundreds of entries.
3. `PERSONA_TONES`'s `Record<PersonaId, string>` typing gives compile-time exhaustiveness — preserve in future REQs.

## Verdict
PASS
