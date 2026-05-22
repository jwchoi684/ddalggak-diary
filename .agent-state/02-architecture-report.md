# Architecture Report — REQ-016

## Key Findings

1. `Persona` type has `id`, `emoji`, `label`, `shortDesc`, `systemPrompt`, `sampleGreeting`. Use `shortDesc` for the picker.
2. `PERSONAS` is the 14-element master array at `@/design-system/personas`.
3. `useDialogControl` + `<dialog>` pattern (BottomSheet, ConfirmDialog, MoodPickerSheet, PhotoViewer) is consistent.
4. Two approaches: (a) page route `/chat/new` with full-screen dialog UI, (b) modal triggered from /chat. Page route chosen for history-stack consistency — closing = router.back().
5. `/chat/new` does not yet exist. Create as new page.tsx.

## File Structure

```
src/app/chat/new/
  page.tsx                       # NEW — picker page
  _components/
    PersonaCard.tsx              # NEW — single grid cell
  __tests__/
    page.test.tsx                # NEW
```

## Risks
- Persona grid: 14 items in 2×7 grid. Scrollable if viewport too short.
- No new dependencies.

## Verdict
PASS
