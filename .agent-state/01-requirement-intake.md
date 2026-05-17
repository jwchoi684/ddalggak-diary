# Requirement Intake — REQ-006

## Restatement

REQ-006는 딸깍일기 앱의 **라우팅 셸(routing shell)** 만 구축한다. 5개 최상위 화면(캘린더 / 일기 에디터 / 리스트 / AI 채팅 / 통계)에 대응하는 Next.js App Router 페이지 파일을 생성하고, 모든 화면 간 이동이 브라우저 history-stack 을 그대로 따르도록 한다. 각 page.tsx 는 "REQ-XXX에서 채워집니다" 수준의 **최소 placeholder** 만 렌더하며, 실제 화면 콘텐츠는 후속 화면 REQ 가 채운다. 뒤로가기 시 (a) 진입 경로에 맞는 이전 화면으로 복귀하고, (b) 리스트의 월·정렬, AI 채팅의 스크롤 위치 같은 화면 상태가 보존되는 것이 핵심 가치다. 모달은 history-stack 에 들어가지 않으므로 로컬 React state 로만 관리한다.

## In Scope (routing shell only)

- 5개 App Router 페이지 파일 생성:
  - `/` → `src/app/page.tsx` (캘린더 placeholder; 기존 REQ-001 파일을 유지·정리)
  - `/diary/[date]` → `src/app/diary/[date]/page.tsx` (에디터 placeholder, dynamic segment)
  - `/list` → `src/app/list/page.tsx`
  - `/chat` → `src/app/chat/page.tsx`
  - `/stats` → `src/app/stats/page.tsx`
- 404 처리용 `src/app/not-found.tsx` 1개 (간단한 한국어 메시지).
- 타입 안전 경로 헬퍼: `src/lib/navigation/routes.ts` (≤ 30줄, 단일 책임).
- `/diary/[date]` 의 date 포맷(YYYY-MM-DD) 유효성 1차 검증 (잘못된 형식이면 `notFound()`).
- Next.js scroll restoration 기본값 확인 및 필요 시 `next.config.ts` 에 명시.
- 라우팅 라이브러리 종속성: **추가 설치 없음** (`next/navigation` 만 사용).

## Out of Scope (page contents → owner REQs)

| Route / Concern | Owner REQ |
|---|---|
| 캘린더 실제 UI (월 그리드·무드 셀) | REQ-007 |
| 무드 선택 바텀시트 모달 | REQ-008 |
| 에디터 본문·저장·삭제 로직 | REQ-009 |
| 에디터 가로 캘린더 드롭다운 | REQ-010 |
| 사진 추가/카로젤/길게 누름 | REQ-011 |
| 사진 전체화면 뷰어 | REQ-012 |
| 리스트 실제 UI·필터 동작 | REQ-013 |
| 통계 그래프 | REQ-014 |
| AI 채팅 화면들 (모드 A~D) | REQ-015 ~ REQ-018 |
| 로딩·에러 페이지(loading.tsx/error.tsx) | 각 화면 REQ |
| 딥링크·공유 URL | v2 (REQ-006 §Non-Goals) |
| 새로고침 후 상태 완전 복구 | v2 (REQ-006 §Non-Goals) |

## Invariants

1. **라우트는 위의 5개 + not-found 만.** REQ-006 안에서 다른 top-level 라우트를 추가하지 않는다.
2. **각 page.tsx 는 최소 placeholder.** 기존 `src/app/page.tsx` 와 동일한 톤(`<main><h1>{화면명}</h1><p>REQ-XXX에서 채워집니다.</p></main>`)을 유지한다.
3. **모달은 URL 라우트가 아니다.** BottomSheet / ConfirmDialog / PhotoViewer 등은 부모 화면 안의 로컬 React state(REQ-005 `useDialogControl` 재사용)로만 표현한다 — modal route, intercepting route, parallel route 사용 금지.
4. **리스트 필터 상태(월 + 정렬)는 URL search params 로 표현한다.** `/list?month=2026-04&sort=desc`. 브라우저 history 가 자동으로 복원해 주므로 별도 sessionStorage 없이 invariant 가 성립한다. (REQ-006 셸에서는 URL 파라미터 컨벤션만 합의하고, 실제 적용은 REQ-013.)
5. **스크롤 위치 보존은 Next.js App Router 기본 동작에 의존한다.** App Router 는 `Link`/`router.push` 내비게이션에서 자동 scroll restoration 을 수행하며 뒤로가기 시 이전 위치로 복원한다. REQ-006 셸은 이 기본값을 깨지 않는다(레이아웃 overflow 강제, 강제 `window.scrollTo` 등 금지).
6. **라우팅 라이브러리 추가 금지.** React Router · TanStack Router 등 별도 패키지 설치 금지. 모든 내비게이션은 `next/link` 와 `next/navigation` 으로만 한다.
7. **경로 문자열 하드코딩 금지.** 컴포넌트는 `Routes.diary('2026-05-17')` 같은 헬퍼만 호출한다. 라우트 변경 시 단일 파일에서 갱신 가능해야 한다.
8. **루트 레이아웃(420px 컨테이너) 유지.** 기존 `src/app/layout.tsx` 가 모든 라우트에 동일하게 적용된다. REQ-006 에서 per-route layout 을 새로 만들지 않는다.
9. **CLAUDE.md File size 규칙 준수.** 모든 신규 파일은 100줄 미만, 단일 책임. placeholder 라 자연히 짧다.

## Open Questions and Recommended Defaults

### Q1. 리스트 필터 상태(월·정렬)는 URL search params 인가 sessionStorage 인가?
- **권장: URL search params.** `/list?month=2026-04&sort=desc`.
- 이유: 브라우저 history 가 search params 까지 자동으로 보존 → 뒤로가기 시 별도 코드 없이 invariant 충족. sessionStorage 는 상태 동기화 코드를 따로 짜야 하고, "뒤로가기 도중 다른 탭에서 변경" 같은 엣지케이스가 생긴다. 또한 v2 딥링크/공유 URL 확장 시 그대로 재사용 가능.
- 트레이드오프: URL 이 조금 길어진다 — MVP 에서는 무시할 수준.

### Q2. 스크롤 복원은 어떻게 보장하나?
- **권장: Next.js App Router 기본값 신뢰 + 검증 1회.** App Router 는 `experimental.scrollRestoration` 없이도 표준 브라우저 scroll restoration 을 활용한다. 셸 단계에서 빈 페이지로 검증해 두고, 만약 REQ-013/017 화면 구현 시 깨지면 그 REQ 에서 `experimental.scrollRestoration: true` 또는 수동 복원으로 대응.
- 이유: 기본 동작이 충분히 동작하는데 미리 옵션을 켜면 미세한 부작용(중복 복원 등)이 생길 수 있다. 셸 단계에서는 회피.
- 책임 분담: REQ-006 = "기본 동작이 깨지지 않게 만든다", REQ-013/017 = "실 컨텐츠로 검증하고 필요시 보강".

### Q3. `useNavigation()` 같은 커스텀 훅을 만들어야 하나?
- **권장: 아니오.** 컴포넌트에서 `next/navigation` 의 `useRouter` / `usePathname` / `useSearchParams` 를 직접 사용한다.
- 이유: 추가 추상화는 referrer 추적·뒤로가기 가로채기 같은 진짜 요구가 생긴 다음에 도입해야 한다. MVP 에서는 wrapper 가 비용만 늘림. 진짜 필요해지는 시점(예: REQ-017 AI 채팅에서 인용 일기→에디터→채팅 복귀를 보장해야 할 때)에 얇은 wrapper 를 도입한다 — Next.js history 가 자연스럽게 처리하므로 그 시점에도 굳이 필요 없을 가능성이 높다.

### Q4. page.tsx placeholder 컨텐츠는 어떤 톤으로?
- **권장: 기존 REQ-001 의 `src/app/page.tsx` 와 동일 패턴.**
  ```tsx
  <main className="px-6 py-8 text-charcoal">
    <h1 className="text-3xl">{화면명}</h1>
    <p className="mt-2 text-meta">REQ-XXX에서 채워집니다.</p>
  </main>
  ```
- 이유: 일관된 톤. 어느 라우트가 어느 REQ 책임인지 화면에서 즉시 확인 가능 → 후속 REQ 진행 추적에 도움.

### Q5. per-route `layout.tsx` 가 필요한가?
- **권장: 아니오.** 루트 `src/app/layout.tsx` 의 420px 컨테이너 하나로 충분.
- 이유: 5개 화면 모두 동일한 좌우 마진·최대 폭을 쓴다. 화면별 헤더(흰 원형 아이콘)는 각 화면 REQ 의 책임이며 layout.tsx 가 아닌 컴포넌트로 풀어야 한다. per-route layout 은 향후 채팅 화면이 sticky composer 같은 특수 레이아웃을 요구할 때 그 REQ 가 도입한다.

### Q6. `loading.tsx`, `error.tsx`, `not-found.tsx` 중 무엇을 REQ-006 에서 두나?
- **권장: `not-found.tsx` 만.** 잘못된 URL 진입(예: `/foo`, 형식 깨진 `/diary/abc`) 시 한국어 404 메시지를 보여준다.
- `loading.tsx` / `error.tsx` 는 각 화면의 데이터 페치·에러 모델이 정해진 뒤(각 화면 REQ) 도입한다. localStorage 기반 MVP 에서는 사실상 loading.tsx 가 의미 없을 가능성이 크다.

### Q7. `/diary/[date]` 의 date 포맷 검증은 어디서?
- **권장: 두 단계.** (a) REQ-006 셸에서는 정규식 `^\d{4}-\d{2}-\d{2}$` 만 검사, 실패 시 `notFound()`. (b) 실제 날짜 유효성(2026-02-31 등)과 1일 1엔트리 라우팅 로직은 REQ-009 에디터 책임.
- 이유: 잘못된 형식의 URL 진입을 셸 레벨에서 차단해야 후속 REQ 의 검증 코드가 단순해진다. 동시에 셸이 너무 많은 도메인 룰을 떠안는 것을 피한다.

### Q8. 타입 안전 경로 헬퍼는 어떤 형태로?
- **권장: `src/lib/navigation/routes.ts`, ≤ 30줄, 객체 + 함수 혼합.**
  ```ts
  export const Routes = {
    calendar: '/',
    diary: (date: string) => `/diary/${date}` as const,
    list: '/list',
    chat: '/chat',
    stats: '/stats',
  } as const;
  ```
- 이유: 컴포넌트에서 `Routes.diary(entry.date)` 라고 쓰면 라우트 변경 시 단일 지점만 수정. `as const` 로 리터럴 타입 보존 → 후속 REQ 에서 라우트 분기 시 타입 좁히기 용이. 별도 라이브러리(`pathpida` 등) 도입은 과잉.

## Dependency Check

- **REQ-001 (스캐폴드)**: Status = DONE. Next.js App Router · `src/app/layout.tsx` · `tsconfig.json` paths(`@/*`) · `globals.css` 모두 준비됨. `src/app/page.tsx` placeholder 도 이미 동일 톤으로 존재 — REQ-006 에서 그대로 이어쓰면 됨.
- REQ-006 은 REQ-002~005 와 **병렬 가능** 항목으로 인덱스에 표시되어 있고, 의존 관계는 REQ-001 하나만이다. REQ-002~005 는 모두 DONE 이지만 REQ-006 는 그들의 산출물에 직접 의존하지 않는다 — placeholder 만 렌더하므로 무드/페르소나/디자인 시스템 호출이 없다.
- 후속 REQ-007/009/013/014/015 모두 REQ-006 을 dependency 로 명시 → 본 REQ 의 5개 라우트 + 경로 헬퍼가 그들이 채울 자리.
- 차단 요인 없음. 곧바로 다음 단계(architecture analysis)로 진행 가능.

## Verdict
PASS
