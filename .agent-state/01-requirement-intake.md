# Requirement Intake — REQ-020 (daily activity icons)

## Restatement
Tag a diary entry with a daily-activity icon (식사, 운동, 카페, …) in addition to the existing 10 feeling moods. Currently the "일상" sub-tab in `MoodPickerSheet` is a dead stub. This REQ activates it by shipping a fixed, system-defined set of 8 activity items. Selection writes to `DiaryEntry.mood` (same field, widened type). All downstream display paths (calendar, list card, stats chart, AI diary serialization) render activity items via a unified lookup.

## In Scope
- `ActivityId` string-literal union (8 members, fixed).
- `ACTIVITIES` constant + `ACTIVITY_MAP` / `getActivityItem`, mirroring MOODS pattern:
  - 식사 🍽️ `#FFD6A5` · 운동 🏃 `#CAFFBF` · 공부 📚 `#BDE0FE` · 카페 ☕ `#D4A5A5` · 산책 🚶 `#B9FBC0` · 여행 ✈️ `#A0C4FF` · 휴식 😴 `#E0BBE4` · 일/업무 💼 `#C8C8C8`
- `PickerId = MoodId | ActivityId` composite type. `DiaryEntry.mood` widens.
- `getPickerItem(id: PickerId)` unified lookup used by MoodIcon / serializer / consumers.
- `MoodIcon` `id` widens to `PickerId`.
- `MoodPickerSheet`: "일상" sub-tab activates, shows activity grid. "기분" still shows 10 moods. "테마" stays disabled.
- Storage types update + barrel export of `ActivityId`, `PickerId`.

## Out of Scope
- User-defined custom activities (locked to fixed set).
- Multi-tag (feeling + activity on same entry).
- Stats split (combined ranking only).
- Splitting `DiaryEntry.mood` into two fields.
- "테마" tab content.

## Invariants
1. 10 existing `MoodId` literals unchanged (PRD §3.4 lock).
2. localStorage key + schema unchanged. ActivityId values stored as plain strings in `mood` field — no migration.
3. Korean strings only.
4. Activity colors pastel (CLAUDE.md §1.6.2).
5. 44×44 touch targets.
6. Card radius 16-20 / shadow per existing tokens.
7. File-size rule: split to `activities.ts` if `moods.ts` exceeds ~100.
8. `MoodIcon` remains single emoji rendering boundary.
9. `DiaryEntry.mood` field name unchanged.
10. `MoodPickerSheet.onSelect` carries `PickerId`; prop renamed `selectedMoodId` → `selectedId`.

## Settled Open Questions
- Q1 Activity count: 8.
- Q2 Pastel colors per Q above.
- Q3 `mood` field stays required.
- Q4 Sheet always opens on "기분" sub-tab.
- Q5 `PickerId` in `types.ts`.
- Q6 `selectedMoodId` → `selectedId`.
- Q7 Stats: combined chart, no special-casing.
- Q8 LLM serializer: switch from MOOD_MAP to getPickerItem.

## Dependencies
REQ-002 / 003 / 005 / 008 / 009 / 014 — all DONE.

## Verdict
PASS
