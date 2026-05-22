# Security Review Report — REQ-012

## Summary

REQ-012 adds a pure client-side, display-only photo viewer (`useSwipe`, `usePhotoViewer`, `PhotoViewer`) that renders photos already stored in `localStorage` as `data:image/` base64 strings. No server communication, authentication, or new dependencies are introduced. The attack surface of this feature is extremely narrow: the only user-controlled value rendered is `photo.dataUrl`, which is gated by REQ-011's `addPhotoFromFile` MIME-prefix guard before it ever reaches storage.

## Scope

- `src/lib/hooks/useSwipe.ts`
- `src/lib/hooks/usePhotoViewer.ts`
- `src/app/diary/[date]/_components/PhotoViewer.tsx`
- `src/lib/storage/photoBase64.ts` (REQ-011 trust boundary, read-only reference)
- `src/app/diary/[date]/_components/Editor.tsx` (integration delta only)

## Critical Issues

None.

## High Issues

None.

## Medium Issues

None.

## Low Issues

**L-1. `data:image/` MIME guard is enforced only at write time (REQ-011); the viewer has no independent read-time re-validation.**

Line 45 of `photoBase64.ts` enforces `dataUrl.startsWith('data:image/')` before persisting to `localStorage`. `PhotoViewer.tsx` line 98 renders the stored value directly via `<img src={photo.dataUrl}>` without re-checking. This is architecturally correct for a trusted same-origin `localStorage` store (no cross-origin writes are possible), but if the storage schema were ever migrated or patched by another code path that bypasses `addPhotoFromFile`, a `data:text/html` or `javascript:` payload could reach the `src` attribute. The current codebase has no such bypass path. Risk is negligible in the current design; worth noting if the storage layer is extended later.

Recommendation: A one-line guard at read time (`if (!photo.dataUrl.startsWith('data:image/')) return null`) inside `PhotoViewer` would make the component independently safe regardless of upstream assumptions, at near-zero cost.

**L-2. `{open && (...)}` gate removes the `<img>` from the React tree when the viewer is closed, but `photo.dataUrl` (a potentially large string) remains in memory as part of `state.photos`.**

This is not a new exposure introduced by REQ-012 — the same data already resided in `PhotoCarousel` thumbnails. No additional leakage surface. Noted for completeness.

**L-3. `onDialogClick` intentionally omitted.**

The `useDialogControl` hook exposes an `onDialogClick` handler that other dialogs (`ConfirmDialog`, `BottomSheet`) spread onto `<dialog>` to enable backdrop-click-to-close. `PhotoViewer.tsx` line 17 explicitly omits this, preventing accidental close via swipe-ending-on-backdrop. This is a correct deliberate UX and security-neutral choice — no new attack surface is created by keeping the dialog open on backdrop click.

## Commands Run

```bash
git diff HEAD~1 HEAD -- src/
rg -n "dangerouslySetInnerHTML|innerHTML|eval\(|new Function" [new files]
rg -n "password|secret|token|api_key|private_key|apiKey|API_KEY" [new files]
rg -n "fetch\(|XMLHttpRequest|WebSocket|import\(" [new files]
rg -n "console\.log|console\.error|console\.warn" [new files]
rg -n "data:image/" PhotoViewer.tsx
cat package.json
```

## Required Fixes

None.

## Accepted Residual Risks

**L-1 accepted:** The `data:image/` prefix is validated at the storage write boundary by REQ-011. Re-validation at the viewer is a defense-in-depth improvement that may be deferred; the current trust model (same-origin `localStorage`, single write path) is sound for the current application scope.

**L-2 accepted:** In-memory retention of base64 image data is inherent to the localStorage-based storage design chosen at the architecture level. Not a REQ-012 concern.

**L-3 accepted:** Intentional by spec (PRD §2.1, REQ-012 design). Documented in code with a comment.

## Security Checklist Result

| Item | Result |
|---|---|
| Authentication checks | N/A — fully client-side, no auth layer |
| Authorization / resource ownership | N/A — single-user localStorage |
| IDOR risks | None — no server-side IDs, no cross-user data |
| Tenant / user isolation | N/A |
| Input validation | dataUrl validated at write time by REQ-011; viewer reads from trusted store |
| Injection risks | No `innerHTML`, no `eval`, no `new Function` anywhere in new files or production code |
| XSS / unsafe rendering | `<img src={photo.dataUrl}>` is safe for `data:image/` URIs; no HTML string interpolation |
| CSRF | No mutations via network requests; no state-changing server calls |
| Secret leakage | No secrets, tokens, or API keys in any new file |
| Sensitive data logging | No `console.log` calls in new files |
| File upload / path traversal | File upload handled by REQ-011; viewer is display-only |
| SSRF | No outbound network requests |
| Dependency vulnerabilities | No new dependencies added |
| Internal error disclosure | `try/catch` in `useSwipe` for `setPointerCapture` swallows silently — correct |
| Rate limiting / abuse | N/A — no server calls |
| Insecure defaults | None identified |
| Permission changes | None |

## Verdict
PASS
