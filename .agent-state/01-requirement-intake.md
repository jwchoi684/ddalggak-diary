# Requirement Intake — Kakao-Only Login

## Restatement
`/login` 페이지에서 **이메일 Magic Link를 완전히 제거**하고 **카카오 로그인 단독**으로 전환한다. 신규 가입과 기존 로그인은 OAuth provider 표준상 동일 흐름이므로 단일 진입점("카카오로 시작하기")이 둘 다 처리한다.

## In Scope
- `/login` 페이지를 카카오 OAuth 단독으로 교체. 이메일 input, signInWithOtp 호출, 상태 머신(`idle/sending/sent/error`) 제거.
- `KakaoLoginButton` 디자인 시스템 컴포넌트 신규 추가 (`src/design-system/KakaoLoginButton.tsx`) — 카카오 가이드라인 컬러 `#FEE500` + 검정 텍스트 + 카카오 말풍선 SVG. 100줄 이내.
- 카카오 OAuth는 `supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: '<origin>/auth/callback?next=<encoded>' } })` 호출.
- Hash fragment 에러 (`#error=...`) 처리: 만료/실패 시 한글 메시지 표시. 카카오 OAuth는 prefetch 무관하지만 동의 거절/취소 등 fail 케이스를 사용자 친화 메시지로.
- Supabase Auth Provider에 Kakao 등록 (Management API). 사용자가 제공한 REST API Key + Client Secret 사용.
- Kakao Developers 콘솔 prerequisite는 README/배포 가이드에만 안내 (코드 변경 X).
- 기존 `/auth/callback` 라우트는 그대로 (OAuth code exchange 호환).

## Out of Scope
- 다른 SNS 로그인 (Naver/Google/Apple/Facebook). 별도 요청 시.
- 카카오 message/talk_message 권한.
- 사용자 탈퇴.
- KakaoTalk in-app browser detection 분기.
- Magic Link를 "백업"으로 유지 (사용자 명시: "카카오 가입 로그인만 남겨줘").
- DB 마이그레이션 (Supabase auth.users 변경 없음, 트리거 기반 profiles 생성도 그대로).
- 기존 Magic Link로 가입한 사용자(있다면)의 데이터 마이그레이션 — 현재 prod에 매직 링크 가입 user가 0명일 가능성 높음 (방금 배포). 만약 있어도 같은 이메일의 카카오 계정으로 로그인하면 Supabase가 자동 identity link.

## Invariants
1. UI 텍스트는 한국어.
2. 카카오 브랜드 컬러 `#FEE500` / 검정 텍스트. 카카오 가이드라인 (https://developers.kakao.com/docs/latest/ko/kakaologin/design-guide) 준수.
3. 44×44 최소 터치 타깃 (Button height ≥ 48px 권장).
4. Card radius / shadow는 기존 tokens.
5. 100-줄 파일 가이드 (CLAUDE.md).
6. Korean 라벨: "카카오로 시작하기".
7. `/auth/callback` 라우트 변경 금지 (현재 OAuth 호환).
8. `src/middleware.ts` 변경 금지 (auth 보호 로직 동일).
9. `supabase/schema.sql` 변경 금지 (스키마 그대로).

## Settled Open Questions
- Q1 Magic Link 처리: **완전 제거** (사용자 직접 결정).
- Q2 카카오 동의항목: 닉네임 필수 + 이메일 선택. 추가 scope 없음.
- Q3 hash error 메시지: 같은 commit에 포함 (간단한 useEffect 한 줄로 처리 가능).
- Q4 신규 가입 UX: 별도 가입 흐름 없음 (OAuth는 가입/로그인 단일 entry).
- Q5 카카오 키 저장: Supabase Auth Provider 측 (Management API로 등록). 앱 코드/env에는 없음.
- Q6 KakaoLoginButton: `src/design-system/` 에 신규. 재사용성 + CLAUDE.md 컴포넌트 재사용 규칙 준수.

## Dependencies
- Supabase Auth (이미 배포됨, project `vrkkqnmooynogditnquu`).
- Kakao Developers 앱 등록 (사용자가 제공할 REST API Key + Client Secret) — **prerequisite, 코드 작업 후에도 키 등록 전까진 prod 동작 불가**.

## Verdict
PASS
