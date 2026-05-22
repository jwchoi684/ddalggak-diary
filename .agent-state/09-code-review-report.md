# Code Review — REQ-016

Display-only persona picker. 14 cards rendered from `PERSONAS` master. Reuses `Card`, `IconButton`. Routes to `/chat/session?personaId=...` (REQ-017 placeholder).

## Invariants
- 14 personas rendered ✓
- Korean strings exact ✓
- `data-testid="persona-card-{id}"` ✓
- aria-label format ✓

## Verdict
PASS
