# Infra — REQ-017

## New Infra Surface
- New API route `/api/chat` (Next.js Route Handler — server-side).
- New env var: `OPENAI_API_KEY` (must be set at deployment).

## Deployment Impact
- Deployment environments (e.g., Vercel) must set `OPENAI_API_KEY` env var.
- `.env.local.example` already includes the placeholder.
- No Docker / k8s changes.
- No new npm dependencies.

## Rollback
Standard git revert + remove env var if previously rolled out.

## Observability
- No new logging/metrics. Server route silently fails or returns Korean error message.
- Future: rate-limit + usage telemetry for cost control (P2).

## Non-Blocking
- Consider Vercel "Edge Function" runtime declaration for better cold-start (default Node runtime works fine).
- Per-user/IP rate limit not enforced — open invitation to abuse if deployed publicly. MVP is single-user-personal so acceptable; production would need a gate.

## Verdict
PASS
