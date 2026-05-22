# Design — REQ-018
- `/chat/[id]/page.tsx` (read-only)
- `_components/ReadOnlyChatHeader.tsx` — back + persona "(종료됨)" + trash
- Reuse MessageBubble + CitedDiaryChip
- Bottom banner: "종료된 대화입니다." + "새 대화 시작" → `/chat/new`
- Delete via ConfirmDialog → removeConversation → router.push(Routes.chat)
- ZERO `<textarea>` or `<input type="text">` in DOM
- `notFound()` when id not in conversations

## Verdict
PASS
