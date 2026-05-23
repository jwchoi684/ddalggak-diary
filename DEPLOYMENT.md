# 딸깍일기 배포 가이드 (Vercel + Supabase)

이 문서는 처음부터 끝까지 따라 하면 자기 도메인에 앱이 뜨도록 작성되어 있습니다. Supabase와 Vercel 모두 무료 티어로 시작할 수 있어요.

> 본 가이드는 **Phase 1**(인프라 + 인증)까지 적용된 상태를 기준으로 합니다. Phase 2-4(데이터/사진/대화 마이그레이션)는 별도 커밋에서 진행됩니다.

---

## 0. 사전 준비
- Node.js 22 이상 + npm
- Vercel 계정 https://vercel.com (GitHub 로그인 권장)
- Supabase 계정 https://supabase.com (GitHub 로그인 권장)
- OpenAI API 키 (REQ-017에서 사용) — https://platform.openai.com/api-keys

---

## 1. Supabase 프로젝트 생성

1. https://supabase.com/dashboard → **New project**
2. Name: `ddalkkak-diary` (또는 원하는 이름)
3. Region: `Northeast Asia (Seoul)` 권장
4. Database Password: 자동 생성 후 안전한 곳에 저장
5. 프로젝트가 만들어지면 (~2분) 좌측 메뉴 **Project Settings → API**:
   - **Project URL** 복사 → 나중에 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** 복사 → 나중에 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 1.1 SQL 스키마 적용

좌측 메뉴 **SQL Editor → New query** 에서 `supabase/schema.sql` 전체를 붙여넣고 **Run** 클릭. 다음을 한 번에 생성합니다:

- `profiles`, `diaries`, `photos`, `conversations`, `settings` 테이블
- 모든 테이블에 RLS (Row Level Security) 활성화 + 본인 데이터만 보이는 정책
- `auth.users` 신규 가입 시 `profiles` 행 자동 생성 트리거
- `diary-photos` Storage 버킷 (5 MB 제한, image MIME만) + 본인 폴더 정책

성공하면 `Success. No rows returned.` 가 나옵니다.

### 1.2 인증 (Magic Link) 설정

좌측 메뉴 **Authentication → Providers → Email**:
- **Enable Email provider** 체크
- **Confirm email** 권장: ON (Magic Link)
- 저장

좌측 **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3001` (로컬 개발용; Vercel 배포 후 prod URL로 추가)
- **Redirect URLs**: 다음 두 개 추가
  ```
  http://localhost:3001/auth/callback
  https://<your-vercel-domain>/auth/callback
  ```
  Vercel 배포 후 실제 도메인을 알게 되면 두 번째 줄을 갱신합니다.

---

## 2. 로컬 환경 변수

`.env.local` 파일을 프로젝트 루트에 만들고 다음을 채웁니다:

```bash
OPENAI_API_KEY=sk-...                       # OpenAI 콘솔에서
NEXT_PUBLIC_SUPABASE_URL=https://...        # Supabase Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # 같은 페이지의 anon public key
```

이 파일은 `.gitignore`에 포함되어 있어 commit되지 않습니다. `.env.local.example`에 placeholder만 들어 있으니 절대 거기엔 실제 키를 넣지 마세요.

### 2.1 로컬 확인

```bash
npm install                # @supabase/ssr 등 설치
npm run dev                # 보통 http://localhost:3000 (또는 3001)
```

브라우저에서 열면 미들웨어가 인증되지 않은 사용자를 `/login`으로 리다이렉트합니다.
이메일을 입력하고 **로그인 링크 받기** → 메일함 확인 → 링크 클릭 → 다시 앱으로 돌아오면 로그인 완료.

---

## 3. Vercel 배포

### 3.1 GitHub 리포지토리 푸시

```bash
git push origin master
```

(이미 GitHub에 푸시 중이 아니라면 GitHub에 새 리포 만든 뒤 `git remote add origin ...` + `git push -u origin master`)

### 3.2 Vercel 프로젝트 import

1. https://vercel.com/new → **Import Git Repository** → 해당 리포 선택
2. **Framework Preset**: Next.js (자동 감지됨)
3. **Build & Output Settings**: 그대로 두기 (`npm run build`)
4. **Environment Variables** 섹션에 다음 3개 추가:
   - `OPENAI_API_KEY` = (값)
   - `NEXT_PUBLIC_SUPABASE_URL` = (값)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (값)
5. **Deploy** 클릭

빌드 완료 후 `https://your-project.vercel.app` 형태의 URL을 받게 됩니다.

### 3.3 Supabase redirect URL 갱신

Supabase 대시보드 **Authentication → URL Configuration**:
- **Site URL**을 prod URL로 (예: `https://ddalkkak-diary.vercel.app`)
- **Redirect URLs**에 `https://ddalkkak-diary.vercel.app/auth/callback` 추가

이걸 안 하면 prod에서 Magic Link 클릭 시 콜백이 실패합니다.

---

## 4. 사용 흐름

1. 첫 방문 → `/login` 으로 자동 이동
2. 이메일 입력 → 메일함의 링크 클릭 → `/auth/callback` 처리 → `/`(캘린더)로 이동
3. 캘린더 + FAB + BottomNav 정상 사용
4. **로그아웃**: 설정 화면 하단 "계정 → 로그아웃"

---

## 5. 데이터 저장 위치 (Phase 1 시점)

이 가이드의 Phase 1만 적용된 상태에서는:

- **인증**: Supabase Auth (Magic Link)
- **일기 / 대화 / 설정**: 아직 **브라우저 localStorage** (Phase 2-4에서 Supabase로 이전)
- **사진**: 아직 localStorage 내 base64 (Phase 3에서 Supabase Storage로 이전)

즉, Phase 1만으로는 로그인은 되지만 데이터는 여전히 디바이스에 묶여 있습니다. 다른 기기에서 로그인해도 일기는 보이지 않습니다. Phase 2-4 적용 후 그 동기화가 가능해집니다.

---

## 6. Phase 2-4 진행 시 체크리스트 (참고)

마이그레이션 진행 시 다음을 순서대로:
- Phase 2: `useDiaries` / `useSettings` → Supabase `from('diaries')` / `from('settings')` 호출. 모든 caller에 await + loading 상태.
- Phase 3: `addPhotoFromFile` → File을 Supabase Storage(`diary-photos/${userId}/${diaryId}/${uuid}.jpg`)에 업로드, public URL을 `photos.storage_path`에 저장. `<img src>` 는 signed URL로 교체.
- Phase 4: `useConversations` → Supabase `from('conversations')`. 메시지 JSON은 `messages` JSONB 컬럼에 그대로.
- Phase 5: 기존 localStorage 데이터를 Supabase로 일회성 export → import 헬퍼 (Settings 화면 "Supabase로 이전" 버튼).

---

## 7. 문제 해결

**"Invalid login credentials" / "Email not confirmed"**
- Supabase Auth에서 Email provider가 활성화됐는지 확인.
- Confirm email이 ON이면 메일 인증을 거쳐야만 로그인됩니다.

**"redirect_to is invalid"**
- Supabase URL Configuration의 Redirect URLs에 현재 도메인의 `/auth/callback`이 추가됐는지 확인.

**Vercel 빌드 실패: "Module not found: @supabase/ssr"**
- `package.json`에 `@supabase/ssr` + `@supabase/supabase-js` 가 있는지 확인. 없으면 `npm install @supabase/ssr @supabase/supabase-js`.

**Magic Link 메일이 안 옴**
- 무료 티어 SMTP는 시간당 발송 한도가 작습니다. 잠시 후 재시도.
- Spam 폴더 확인.

**RLS 정책 때문에 INSERT가 거부됨**
- `auth.uid()`가 `null`인 상태에서 호출하면 거부됩니다. 클라이언트가 로그인됐는지 확인 (`supabase.auth.getUser()`).

---

## 8. 비용

- **Supabase Free Tier**: 500MB DB + 1GB Storage + 2GB 전송 + 50K MAU. 개인 사용 충분.
- **Vercel Hobby**: 무료 (커머셜 사용 시 Pro 필요).
- **OpenAI gpt-4o-mini**: 입력 $0.15 / 1M tokens, 출력 $0.60 / 1M tokens. 일기 100개 컨텍스트 + 짧은 질문 한 번 ≈ $0.001 이하.
