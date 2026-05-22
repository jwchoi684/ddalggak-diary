# API Contract — REQ-016

## Interfaces

### `PersonaCard` props
```ts
{ persona: Persona; onSelect: (id: PersonaId) => void; }
```

### `page.tsx`
- Route: `/chat/new`.
- Reads: `PERSONAS` from `@/design-system/personas`.
- Routing: `router.push('/chat/session?personaId=' + id)`, `router.back()`.

## Storage
Zero reads, zero writes.

## Korean Strings
- Title: `어떤 톤으로 대화할까요?`
- Close aria-label: `닫기`
- Card aria-label: `{label} 페르소나로 시작`

## Caller Invariants
1. All 14 personas rendered, no filtering.
2. Selection routes to `/chat/session?personaId=` (REQ-017 owns).
3. Close: `router.back()` (returns to /chat).

## Backward Compatibility
- `/chat/new` placeholder route (404 previously) now resolves.
- REQ-015's NewChatButton already routes here.

## Verdict
PASS
