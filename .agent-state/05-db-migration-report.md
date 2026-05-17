# Data Model / Migration Report

## Summary

REQ-004 adds 14 `Persona` constant records, 4 drift-guard string constants (`COMMON_BASE`, `PERSONA_LOCK_GUARD`, `SAFETY_FOOTER`, `SHAMAN_GUARD`), and a `getPersona(id)` lookup helper — all in a single TypeScript source file (`src/design-system/personas.ts`). The project uses `localStorage` as its storage layer (keys under `ddalkkak:*`). There is no relational database, no ORM, no migration runner, and no fixture system. No schema change is required.

## Schema Change Required

None. `Persona` and `PersonaId` are already fully defined in `src/lib/storage/types.ts` (REQ-002). REQ-004 does not touch that file.

## Migration Strategy

Not applicable. No migration file is required or possible — there is no migration runner in this project.

## Backfill / Default / Nullability

Not applicable. Persona master data is a compile-time constant, not a stored row.

## Index Requirements

Not applicable.

## Existing Data Compatibility

`SearchConversation.personaId` (REQ-002 schema, stored in `localStorage` under `ddalkkak:conversations:v1`) already carries a `PersonaId` literal value. REQ-004 does not change the `PersonaId` union — it only populates display and prompt data for the 14 ids already defined in the union. Existing stored `personaId` strings remain valid without any transformation.

## Rollback Considerations

Deleting or reverting `src/design-system/personas.ts` is a code-only rollback. No stored data is affected. Downstream REQs (016, 017, 018) do not exist yet, so there is no integration surface that would cause stored records to break.

## Query Performance Risk

None. `PERSONA_MAP` is an in-memory `Record<PersonaId, Persona>` built once at module load. O(1) lookup, no I/O.

## Seed / Fixture Impact

None. There are no seed files or fixtures for persona data.

## Files Expected to Change

- **New**: `src/design-system/personas.ts`
- **New**: `src/design-system/__tests__/personas.test.ts`
- No existing files are modified.

## Test Requirements

Tests belong in `src/design-system/__tests__/personas.test.ts` (Vitest, `node` environment). Required coverage: array length (14), id-set exhaustiveness and uniqueness, PRD §3.8 display order, `getPersona` throw contract, and drift-guard `.toContain` assertions for all four exported constants. These are purely unit tests; no storage, migration, or fixture concerns apply.

## Future-REQ Note: Adding a 15th Persona

Adding a 15th persona would require expanding the `PersonaId` union in `src/lib/storage/types.ts`. Because `personaId` is stored verbatim in `localStorage` conversation records, this is a data-compatibility event analogous to adding a new `MoodId` value: existing records referencing old ids remain valid, but any UI that renders an exhaustive list must handle the new id without crashing. A coordinated update to `SearchConversation` validation and any exhaustive `switch`/`satisfies` blocks would be required — treat it as a breaking schema change requiring a `ddalkkak:conversations:v2` key bump or a migration shim on read. Document in the owning REQ's intake; do not absorb silently into a patch.

## systemPrompt Changeability

`systemPrompt` values are source-code constants assembled at module load from `COMMON_BASE`, per-persona tone strings, `PERSONA_LOCK_GUARD`, `SAFETY_FOOTER`, and (for shaman only) `SHAMAN_GUARD`. They are never written to storage. Changing any prompt text in a future REQ is a code-only change; no storage migration is needed or relevant.

## Verdict
PASS — not applicable as a traditional DB; persona master is a source-code constant table.
