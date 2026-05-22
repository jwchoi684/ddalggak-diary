# Architecture — REQ-018
- New route `/chat/[id]` with dynamic segment
- Reuses MessageBubble, CitedDiaryChip from session components
- `useConversations()` + `useParams()` to find conversation by id
- `notFound()` when not found

## Verdict
PASS
