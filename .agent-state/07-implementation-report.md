# Implementation Report — REQ-016

## Files

New:
- `src/app/chat/new/page.tsx` (40 lines)
- `src/app/chat/new/_components/PersonaCard.tsx` (24 lines)
- `src/app/chat/new/__tests__/page.test.tsx` (4 cases)

## Behavior
- /chat/new page renders 14 PERSONAS in 2-col grid
- Card tap → router.push('/chat/session?personaId=' + id)
- ✕ → router.back

## Verification
- 350/350 unit pass
- 0 typecheck/lint errors

## Verdict
PASS
