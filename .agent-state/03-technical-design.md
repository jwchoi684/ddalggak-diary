# Technical Design — REQ-016

## Component Signatures

### `PersonaCard` — `src/app/chat/new/_components/PersonaCard.tsx`
```ts
interface PersonaCardProps {
  persona: Persona;
  onSelect: (id: PersonaId) => void;
}
```
- `<button>` wrapping `<Card className="p-4">` full-width.
- Layout: emoji (text-3xl) + label (text-charcoal font-medium mt-2) + shortDesc (text-meta text-sm mt-1).
- `aria-label="{label} 페르소나로 시작"`.
- `data-testid="persona-card-{id}"`.

### `page.tsx` — `src/app/chat/new/page.tsx`
- `"use client"`.
- Header with ✕ close button (aria="닫기") top-right, calling `router.back()`.
- Title: "어떤 톤으로 대화할까요?" centered below header.
- 2-column grid of 14 PersonaCards (grid-cols-2 gap-3).
- onSelect → `router.push('/chat/session?personaId=' + id)`.

## Visual Spec
- Page wrapper `min-h-screen bg-cream px-4 pb-8`.
- Header `flex justify-end pt-4` with IconButton.
- Title `text-xl font-semibold text-charcoal text-center my-4`.
- Grid `grid grid-cols-2 gap-3`.

## Korean Strings
- Title: `어떤 톤으로 대화할까요?`
- Close: `닫기`

## Test Plan
1. PC1: All 14 personas rendered
2. PC2: Tap fires onSelect with correct id
3. PC3: ✕ → router.back called
4. PC4: Tap card → router.push('/chat/session?personaId=...') called

## File Budget
- page.tsx: ~55 lines
- PersonaCard.tsx: ~25 lines

## Verdict
PASS
