# Architecture — REQ-019
- New `src/lib/backup/backup.ts` (pure utility)
- New `src/app/settings/page.tsx`
- Modified `src/lib/storage/settings.ts` (added writeAllSettings)
- Modified `src/lib/navigation/routes.ts` (added Routes.settings)
- Modified `CalendarHeader.tsx` + `CalendarScreen.tsx` (gear icon entry point)
- Reuses Card, IconButton, ConfirmDialog, Toast

## Verdict
PASS
