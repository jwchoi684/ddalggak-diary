# Code Review — REQ-018
Read-only view. ZERO textarea/input in DOM (verified by test RC2). Reuses MessageBubble + CitedDiaryChip. Delete confirms via ConfirmDialog.

## Invariants
- No input component in DOM ✓
- Header "(종료됨)" Korean copy ✓
- removeConversation + Routes.chat redirect on delete ✓
- notFound() on unknown id ✓

## Verdict
PASS
