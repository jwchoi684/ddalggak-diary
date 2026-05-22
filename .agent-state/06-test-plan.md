# Test Plan — REQ-015

## Test Files

### 1. `src/lib/utils/__tests__/formatRelativeTime.test.ts` (10 cases)
1. FRT1: 0s → "방금"
2. FRT2: 59s → "방금"
3. FRT3: 60s → "1분 전"
4. FRT4: 30min → "30분 전"
5. FRT5: 2h → "2시간 전"
6. FRT6: Yesterday → "어제"
7. FRT7: 3d → "3일 전"
8. FRT8: 8d → "YYYY.M.D"
9. FRT9: Negative diff → "방금"
10. FRT10: Explicit `now` param works

### 2. `src/lib/storage/__tests__/useConversations.test.ts` (2 cases)
1. UC1: Initial render isReady=false, conversations=[]
2. UC2: After mount populated from mocked readConversations

### 3. `src/app/chat/_components/__tests__/ConversationCard.test.tsx` (6 cases)
1. CC1: Persona emoji + label rendered
2. CC2: Relative time via formatRelativeTime
3. CC3: Truncates long first message with "…"
4. CC4: First user message (not assistant)
5. CC5: Fallback "(빈 대화)" when no user message
6. CC6: Click fires onTap

### 4. `src/app/chat/__tests__/page.test.tsx` (6 cases)
1. CL1: Empty state shown + new chat button
2. CL2: Sort by lastMessageAt DESC
3. CL3: Single card
4. CL4: Many cards correct order
5. CL5: New chat button → router.push('/chat/new')
6. CL6: Card click → router.push('/chat/' + id)

Total: 24 new cases. No E2E for this REQ.

## Mock Strategy
- `vi.mock('next/navigation')` via setupNextNavigation
- `vi.mock('@/lib/storage/conversations')` for readConversations
- `vi.mock('@/lib/storage/useConversations')` in page tests
- `vi.useFakeTimers()` + `setSystemTime` for relative time tests

## Verdict
PASS
