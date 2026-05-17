# Security Review — REQ-004

## Summary

REQ-004 is a pure-data, pure-function TypeScript module: 14 persona records assembled from 4 drift-guard string constants, one private `assemble` helper, and one `getPersona` getter. It introduces no new runtime or devDependencies, no network calls, no DOM, no localStorage access, and no user-controlled input paths. The sole forward-looking risk is that each `systemPrompt` string will later be injected into LLM calls (REQ-017); that injection boundary is REQ-017's responsibility, but the persona content itself must not pre-seed jailbreak behavior. This review confirms it does not.

## Scope

- `src/design-system/personas.ts`
- `src/design-system/__tests__/personas.test.ts`
- No changes to `src/lib/storage/`, `src/app/`, `package.json`, or any pre-existing file.

## Critical / High / Medium / Low Issues

None new for REQ-004. All carry-forward items cataloged below.

## Prompt Content Audit

### Jailbreak phrase scan

Grep for English jailbreak phrases (`ignore`, `bypass`, `override`, `disregard`, `forget`, `pretend`, `act as`, `DAN`, `do anything now`, `previous instruction`, `new instruction`, `system prompt`) returned zero matches in persona data. One hit was in a JSDoc comment describing `getPersona`'s error path (`// bypasses TypeScript`), not part of any `systemPrompt`.

### Per-persona tone review

All 14 tone strings in `PERSONA_TONES` describe only communication style (speech register, vocabulary, emotional tone, address conventions). No tone string contains instructions to ignore safety constraints, reveal the system prompt, or escalate privilege.

The most authoritative personas — `boss` (blunt) and `king` (archaic imperial) — include inline constraints "모욕적이거나 폄하하는 표현은 절대 사용하지 마세요" (boss) and "의미는 명확하게" (king). Neither escalates toward harmful content.

### SHAMAN_GUARD check

`SHAMAN_GUARD` value: `"점괘로 미래를 단정하거나 불안을 조성하지 말 것 — 어디까지나 캐릭터 연기."`

Applied via the `extra` argument to `assemble()` at line 225. All other 13 personas call `assemble(tone)` with no `extra`. The `if (extra !== undefined)` guard inserts `SHAMAN_GUARD` before `SAFETY_FOOTER` only for shaman. Test case 13 enforces this structurally. PASS.

The shaman tone string itself does not instruct the LLM to predict futures or make factual claims — those behaviors are explicitly blocked by SHAMAN_GUARD.

Info note: shaman's `sampleGreeting` contains `"다음 주엔 좋은 일 있을 거야~"`. This is display-only illustrative copy, not part of `systemPrompt`, so SHAMAN_GUARD does not apply to it. REQ-016/017 must treat `sampleGreeting` as illustrative copy and must not include it in LLM context.

### PERSONA_LOCK_GUARD check

`assemble()` unconditionally inserts `PERSONA_LOCK_GUARD` for all 14 personas. Test case 11 verifies via `.toContain`. PASS.

### SAFETY_FOOTER check

`assemble()` unconditionally pushes `SAFETY_FOOTER` as the final element for all 14. Test case 12 verifies via `.toContain`. PASS.

### Curly-brace token injection guard

Grep for `{[^}]*}` returned only JSDoc comment references and the `throw new Error(\`Unknown PersonaId: ${id}\`)` template literal — not persona field values. Test case 14 asserts `not.toMatch(/\{[^}]+\}/)` for all five fields across all 14 personas. The `○○이~` / `○○님` Korean circle placeholders use no curly braces and correctly pass. PASS.

Critical invariant confirmed: `{diaries_serialized}` does not appear anywhere in persona data. Diary-corpus injection deferred to REQ-017.

### Honorific hardcoding

- `sibling.systemPrompt` contains `"언니"` (hardcoded). PASS.
- `mother.systemPrompt` contains `"우리 아이"` (hardcoded fallback). PASS.
- Neither uses a `{userName}` placeholder that could be exploited by prompt-injection in user names.

## Secret Leakage Verification

Grep for `password`, `secret`, `token`, `api_key`, `private_key`, `API_KEY`, `apiKey`, `bearer`, `Authorization` returned no hits in persona data. The only match was the `{token}` string in a test description comment — not in any exported value.

## Dependency Audit

No new dependencies introduced by REQ-004. `npm audit --audit-level=high --omit=dev` is unchanged from REQ-003 baseline: 0 high or critical. Full audit shows 7 moderate findings, same count as the REQ-003 baseline. Delta: 0.

## Carry-forward (from REQ-003 cycle, still applicable)

REQ-004 makes no changes to `src/lib/storage/`, `src/app/`, or infrastructure. All six carry-forward items remain in their prior state.

1. **`JSON.parse` on localStorage without prototype-pollution guard** — Low/Medium. Hard gate at REQ-019.
2. **`Photo.dataUrl` stored without format validation** — Medium, deferred. Hard gate at REQ-011.
3. **No runtime schema validation on write paths** — Medium, deferred. Hard gate at REQ-019.
4. **`Settings` wide index type** — Low. Must be narrowed as concrete keys land.
5. **esbuild dev-server CORS** (GHSA-67mh-4wv8-2f99) — dev-only. Deferred.
6. **`postcss` CSS stringify XSS** (GHSA-qx2v-qp2m-jg93) — build-tool-only. Deferred.

## Info Observations (non-blocking)

- `sampleGreeting` for shaman contains a mild future-prediction phrase. Not in `systemPrompt`, not passed to LLM by this module. REQ-016/017 must not include `sampleGreeting` in LLM context. A JSDoc note on the `sampleGreeting` field in `src/lib/storage/types.ts` would prevent future mistakes.
- `assemble` is not exported — correctly prevents callers from constructing unauthorized systemPrompts.
- `PERSONA_TONES` is not exported — prevents access to raw tone strings without safety guards.

## Required Fixes

None.

## Accepted Residual Risks

Same six items as REQ-003 carry-forward list. No new residual risks introduced by REQ-004.

## Verdict
PASS
