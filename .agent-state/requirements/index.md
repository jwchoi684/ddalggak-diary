# Requirements Index

Source document: docs/requirements.md (딸깍일기 PRD v1.0, MVP)

## Summary

1177줄 한국어 PRD를 **19개 원자 단위 요구사항(REQ-001 ~ REQ-019)**으로 분할.

- **REQ-001 ~ REQ-006**: 토대 (티어 선택·데이터·디자인 시스템·라우팅 셸).
- **REQ-007 ~ REQ-014**: P0 화면 (캘린더·무드 모달·에디터·사진·리스트·통계).
- **REQ-015 ~ REQ-018**: AI 채팅 4개 모드 (P1, 가장 까다로움).
- **REQ-019**: JSON 백업 (P1, 안전망).

PRD §8.3의 P2 항목(임베딩 RAG / PWA / 클라우드 동기화 / 알림 / streak)과 §13.2의 호칭 사용자 설정, 월/연 picker, 다크모드는 PRD에서 구현 디테일이 충분히 명시되지 않아 인덱스에서 제외. 추후 PRD가 보강되면 REQ를 추가.

**중요한 선행 조건**: REQ-001에서 사용자와 Option A / B / C 중 빌드 티어를 명시적으로 합의해야 후속 REQ의 구현이 결정됨 (CLAUDE.md "Build-order plan" 규칙).

## Requirement List

| ID | Title | Status | Dependencies | Risk |
|---|---|---|---|---|
| REQ-001 | 빌드 티어 결정 및 프로젝트 스캐폴드 | DONE | None | High |
| REQ-002 | 데이터 모델 및 localStorage 저장 레이어 | DONE | REQ-001 | High |
| REQ-003 | 무드 마스터 데이터 + MoodIcon 컴포넌트 | DONE | REQ-001 | Low |
| REQ-004 | 페르소나 마스터 데이터 (14종) + system prompt | DONE | REQ-001 | Medium |
| REQ-005 | 디자인 시스템 프리미티브 | DONE | REQ-001 | Medium |
| REQ-006 | history-stack 기반 네비게이션 셸 | DONE | REQ-001 | Medium |
| REQ-007 | 메인 캘린더 화면 | DONE | REQ-002, REQ-003, REQ-005, REQ-006 | Medium |
| REQ-008 | 무드 선택 바텀시트 모달 | DONE | REQ-002, REQ-003, REQ-005 | Low |
| REQ-009 | 일기 에디터 (단일 화면, 신규+편집 통합) | DONE | REQ-002, REQ-003, REQ-005, REQ-006, REQ-008 | High |
| REQ-010 | 에디터 내 가로 캘린더 인라인 드롭다운 | DONE | REQ-002, REQ-003, REQ-005, REQ-009 | Medium |
| REQ-011 | 사진 추가 / 카로젤 / 길게 누름 삭제 | DONE | REQ-002, REQ-009 | Medium-High |
| REQ-012 | 사진 전체화면 뷰어 | DONE | REQ-011 | Low |
| REQ-013 | 일기 리스트 화면 | DONE | REQ-002, REQ-003, REQ-005, REQ-006 | Low-Medium |
| REQ-014 | 통계 화면 | DONE | REQ-002, REQ-003, REQ-005, REQ-006 | Low |
| REQ-015 | AI 채팅 — 대화 리스트 (모드 A) | DONE | REQ-002, REQ-004, REQ-005, REQ-006 | Low |
| REQ-016 | AI 채팅 — 페르소나 선택 모달 (모드 B) | TODO | REQ-004, REQ-005, REQ-015 | Low |
| REQ-017 | AI 채팅 — 활성 세션 (모드 C) + LLM 호출 플로우 | TODO | REQ-002, REQ-004, REQ-009, REQ-015, REQ-016 | High |
| REQ-018 | AI 채팅 — 과거 대화 읽기 (모드 D) | TODO | REQ-015, REQ-017 | Low |
| REQ-019 | JSON 백업 — 내보내기 / 가져오기 | TODO | REQ-002 | Medium |

## Recommended Execution Order

토대 → P0 화면 → AI 채팅 → 데이터 백업. AI 채팅(REQ-015~018)을 P0 화면 완성 후로 미루는 이유: PRD §8.2에서 P1로 분류했고, API 키·과금·격리 설계가 까다로워 P0 출시 자체를 늦출 위험이 있음.

1. REQ-001  ← **사용자와 티어 합의가 필수 선행**
2. REQ-002
3. REQ-003 ⇄ REQ-004 ⇄ REQ-005 ⇄ REQ-006 (병렬 가능)
4. REQ-007
5. REQ-008
6. REQ-009
7. REQ-010 ⇄ REQ-011 (병렬 가능, 둘 다 REQ-009에만 의존)
8. REQ-012
9. REQ-013 ⇄ REQ-014 (병렬 가능)
10. REQ-019 ← 여기까지로 P0 출시 가능
11. REQ-015
12. REQ-016
13. REQ-017
14. REQ-018

## Notes

- **High 위험 REQ**: REQ-001(티어 결정의 캐스케이드 영향), REQ-002(스키마 굳어지면 마이그레이션 비용), REQ-009(에디터 = 데이터 입력의 핵심), REQ-017(컨텍스트 격리·API 키 보안·hallucination).
- **CLAUDE.md 규칙 적용 지점**:
  - "Editor screen is one screen, not two" → REQ-009.
  - "AI chat architecture (the non-obvious part)" → REQ-017 전체와 REQ-018의 입력창 부재.
  - "UI 컴포넌트 재사용 규칙" → REQ-005 이후 모든 화면 REQ는 디자인 시스템 폴더부터 검색.
  - "File size & responsibility rule" → REQ-007/009/013/014/017이 잠재적 100줄 초과 후보.
- AI 채팅 부분(REQ-015~017)은 PRD §10.5의 Option A(사용자 API 키 클라이언트 직접 호출)와 Option B/C(서버리스 프록시) 구현이 크게 다름. REQ-017 시작 전에 다시 한 번 티어를 확인.

## Next

```
/requirement-run "REQ-001"
```
