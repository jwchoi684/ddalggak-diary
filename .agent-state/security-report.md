# Security Review Report — REQ-011

## Summary

REQ-011 adds purely client-side photo attachment to the diary editor. The attack surface introduced is narrow: a `<input type="file">`, `FileReader.readAsDataURL`, a base64 size cap, carousel rendering via `<img src={dataUrl}>`, and a long-press overlay with a `document.pointerdown` global listener. No new network calls, no new server-side code, no new dependencies, and no authentication or authorization surfaces were touched. All identified issues are Low severity. No Critical, High, or blocking Medium issues were found.

## Scope

Files reviewed:

- `src/lib/storage/photoBase64.ts`
- `src/lib/hooks/useLongPress.ts`
- `src/app/diary/[date]/_components/PhotoCarousel.tsx`
- `src/app/diary/[date]/_components/Editor.tsx`
- `src/app/diary/[date]/_components/EditorBody.tsx`
- `e2e/_helpers/seedDiaries.ts`
- `package.json` (dependency audit)
- Git diff for REQ-011

## Critical Issues

None.

## High Issues

None.

## Medium Issues

None.

## Low Issues

### L-1: No MIME type prefix validation on the dataUrl before storage and rendering

`photoBase64.ts` checks `dataUrl.length > MAX_PHOTO_DATAURL_BYTES` but does not verify that the dataUrl string begins with `data:image/`. An attacker who can inject a crafted `File` object (via a browser extension, JavaScript console, or injected test infrastructure) could produce a dataUrl beginning with `data:text/html,` or `data:text/javascript,`. When stored in localStorage and later loaded, `<img src={dataUrl}>` renders it: browsers apply strict content-sniffing and treat a `data:text/html` as a document only when used in a navigation context (iframe src, window.open) — not when used as an `<img src>`. The actual rendering is safe in the `<img>` case. However, if any future code ever uses the stored `dataUrl` in a different context (e.g., an `<a href>`, a dynamically created iframe, or a `URL.createObjectURL` call), the absence of a prefix check becomes dangerous. The risk is currently theoretical and bounded by the single-user localStorage scope.

Recommended fix: add `if (!dataUrl.startsWith('data:image/'))` before the size check in `photoBase64.ts` and return `{ ok: false, reason: 'load_failed' }`. This is a one-line change that eliminates any future-use risk.

### L-2: `new Function(...)` in test helper is not guarded from IDE/tool execution paths

`e2e/_helpers/seedDiaries.ts` uses `new Function(...)` at lines 19 and 37. The constructed function is passed to Playwright's `page.addInitScript`, which serializes and sends it to the browser — this is the intended and safe use. The concern is narrower: the `json` variable embedded in the function body string is produced from `JSON.stringify(entries)` and then re-stringified with `JSON.stringify(json)`. For normal test data this is safe. If test entries were ever seeded with attacker-controlled diary text (not the case currently), nested stringification could theoretically escape the string delimiter. In practice, `JSON.stringify` always produces a safe JSON-escaped string and `JSON.stringify(json)` double-escapes it safely. Risk is negligible. Flagged as a maintenance note only — no fix required unless entries gain user-controlled keys used in the template.

## Commands Run

```bash
git diff HEAD~1 HEAD -- src/ e2e/
rg "password|secret|token|api_key|private_key|dangerouslySetInnerHTML|innerHTML|eval\(|new Function" src/ --include="*.ts" --include="*.tsx"
rg "dataUrl" src/ --include="*.ts" --include="*.tsx"
rg "navigator\." src/ --include="*.ts" --include="*.tsx"
grep -rn "MAX_PHOTO_DATAURL_BYTES" src/
find . -name "*.ts" | xargs grep -l "new Function"
cat package.json
```

## Required Fixes

None are blocking. L-1 mitigation (one-line prefix guard in `photoBase64.ts`) is recommended before REQ-012 which will wire the full-screen viewer — that context increases the likelihood that `dataUrl` flows into additional rendering paths.

## Accepted Residual Risks

1. **localStorage quota exhaustion (DoS-self only):** The 150 KB per photo cap and 10-photo limit expose a theoretical 1.5 MB-per-entry storage footprint. The `saveFn` try/catch handles `QuotaExceededError`. This is a product-level tradeoff documented in the PRD and accepted for MVP.

2. **`accept="image/*"` is advisory only:** Browsers display only image files in the picker by default but do not block a renamed non-image file. The `FileReader.readAsDataURL` + `getDimensions` pipeline provides an implicit secondary filter: if the bytes do not decode as a valid image, `img.onerror` fires and `addPhotoFromFile` returns `{ ok: false, reason: 'load_failed' }`. No malicious content reaches state or storage in the failure path.

3. **`document.pointerdown` global listener while overlay is open:** The listener fires for all global pointer events while `isActive` is true in a `Thumb`. The `overlayRef.current.contains(e.target)` containment check is the sole guard. This pattern is idiomatic React and the risk is correctly scoped: the listener is removed in the `useEffect` cleanup when `isActive` flips false. No data exfiltration path exists.

4. **Single-user scope:** All data is confined to `localStorage`. No PII exfiltration risk exists in this client-only deployment. If the app ever adds cloud sync, the absence of a MIME prefix check (L-1) and the raw base64 storage format would require re-evaluation.

## Verdict
PASS
