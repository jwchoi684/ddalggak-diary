# Test Plan — REQ-016

## Tests

### `src/app/chat/new/__tests__/page.test.tsx` (4 cases)
1. PC1: All 14 personas rendered (count check)
2. PC2: Card click fires router.push('/chat/session?personaId=...')
3. PC3: ✕ button click fires router.back()
4. PC4: Each card has correct aria-label

Total: 4 cases.

## Mock Strategy
- vi.mock('next/navigation') via setupNextNavigation

## Verdict
PASS
