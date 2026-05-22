# Requirement Intake — REQ-016

## Restatement
Persona picker modal opened from REQ-015's "새 대화 시작" button. 2-column grid showing all 14 personas with emoji + label + description. Tap selects persona and routes to REQ-017 chat session. ✕ closes back to /chat.

## Scope IN
- New page route `/chat/new` (replaces the placeholder).
- `PersonaPickerModal` using `useDialogControl` + native `<dialog>` (consistent with MoodPickerSheet/PhotoViewer).
- 2x7 grid of all 14 PERSONAS from `@/design-system/personas`.
- Selection → router.push to /chat/session?personaId=X (REQ-017 will own that route).
- ✕ → router.back to /chat.

## Scope OUT
- Persona favorites/sorting (v2)
- Custom personas (out of scope)

## Invariants
- All 14 personas from `PERSONAS` master rendered, no filtering.
- Korean: title "어떤 톤으로 대화할까요?", close aria "닫기".
- Card per persona: bg-paper, p-4, 16px radius, emoji 40-48px + label + description.
- Tap target ≥ 44×44 per cell.
- No persona favorites order — render in master array order.

## Open Questions Settled
- Modal vs page: page route `/chat/new` rendered as fullscreen dialog (matches PhotoViewer pattern, history-stack consistent).
- Routing on select: `router.push('/chat/session?personaId=' + id)` placeholder (REQ-017 owns).
- Description text: each Persona already has `.description` field (verify in architecture).

## Dependencies
REQ-004, REQ-005, REQ-015 all DONE.

## Verdict
PASS
