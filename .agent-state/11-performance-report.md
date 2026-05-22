# Performance — REQ-017

- Diary corpus serialization: O(n) per request. Sent in system prompt — token cost grows linearly with diary count. Acceptable for MVP.
- LLM call: bounded by max_tokens=500 + temp=0.7. Single fetch per user message.
- `useChatSession` useReducer — bounded re-renders.

## Non-Blocking
- For users with very large diary corpus, embeddings/RAG would be needed (PRD §8.3, P2).

## Verdict
PASS
