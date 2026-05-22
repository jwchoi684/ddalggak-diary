# Requirement Intake — REQ-015

## Restatement
REQ-015 builds the **AI 채팅 — 대화 리스트** screen (Mode A), the default landing view for the AI search feature. It shows a fixed "➕ 새 대화 시작" button at the top, followed by past `SearchConversation` cards sorted by `lastMessageAt` DESC. Each card displays persona emoji + label, a Korean relative time, and the first user message truncated to ~30 chars. An empty state replaces the list when no conversations exist. Route: `/chat`.

## Scope IN
- New `src/app/chat/page.tsx` (replaces current stub).
- New `ConversationCard` and `NewChatButton` subcomponents under `src/app/chat/_components/`.
- New shared util `src/lib/utils/formatRelativeTime.ts` (Korean relative time formatter).
- A `useConversations()` client hook mirroring `useDiaries()` SSR-safe pattern.
- Back chevron in header → `router.back()`.
- Unit tests.

## Scope OUT
- Persona picker modal (REQ-016) — `NewChatButton.onClick` calls `router.push('/chat/new')` (placeholder).
- Past-conversation reading view (REQ-018) — card tap calls `router.push('/chat/' + id)`.
- Conversation deletion, search, filters.
- LLM calls or writes to storage (REQ-017).
- E2E (optional per spec).

## Invariants
1. Fixed "➕ 새 대화 시작" button rendered above the list, also visible in empty state.
2. Sort: cards strictly descending by `lastMessageAt` (ISO 8601 lexicographic compare).
3. Card top row: `<persona emoji> <persona label> · <relative time>`; body: first user message truncated to 30 chars + "…" if longer.
4. Empty state: "아직 대화가 없어요. AI에게 일기에 대해 물어보세요" + "새 대화 시작" button.
5. Read-only screen — no localStorage mutation.
6. SSR safety via `useConversations()` `isReady` gate.
7. No 0-message cards (per REQ-017 conversations without messages are not persisted).
8. Route: `/chat` (existing `Routes.chat`).
9. Korean strings only.
10. CLAUDE.md reuse: Card, EmptyState, IconButton.

## Settled Open Questions
| Question | Default |
|---|---|
| Relative-time thresholds | `<60s` "방금", `<60min` "X분 전", `<24h` "X시간 전", calendar yesterday "어제", `<7d` "X일 전", else "YYYY.M.D" (no zero-pad per PRD example "2026.5.12") |
| First message | `messages.find(m => m.role === 'user')?.content ?? ''`; fallback "(빈 대화)" |
| 30-char truncation | `content.length > 30 ? content.slice(0, 30) + '…' : content` |
| Card click | `router.push('/chat/' + id)` |
| New chat button | `router.push('/chat/new')` placeholder (REQ-016 owns this route) |
| Header back | `router.back()` |
| Type naming | Storage type is `SearchConversation`, not `Conversation`. Keep storage name; UI component named `ConversationCard` |

## Dependency Check
- REQ-002 DONE
- REQ-004 DONE
- REQ-005 DONE
- REQ-006 DONE

## Verdict
PASS
