# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repository currently contains **no source code** — only a product requirements document:

- `docs/diary-app-prd.md` — the single source of truth. Korean-language PRD (v1.0, MVP) for **딸깍일기 (Ddalkkak Diary)**, a personal emotional diary web app. Read this before doing any implementation work; it specifies screens, interactions, data models, personas, and tech-stack staging in enough detail to be implemented from a single prompt.

There is no `package.json`, no build tooling, no tests, and no git history yet. Do not fabricate build/lint/test commands until a stack is actually chosen and scaffolded.

## Product, in one paragraph

딸깍일기 is a Korean-language web diary where users tap a mood (1 tap), write a short entry, and later query their accumulated entries in natural language via an AI chat that adopts one of 14 personas (friend, lover, mother, king, shaman, therapist, etc.). The calendar shows mood emojis instead of dates so a month's emotions are visible at a glance. Mobile-first responsive web (no native app); desktop centers the layout at `max-width: 420px`.

## Confirmed decisions (PRD §13.1) — do not relitigate

These are locked and inform every implementation choice:

| Topic | Decision |
|---|---|
| App name | **딸깍일기** |
| Moods | **10 fixed moods** with pastel colors (PRD §3.4 master table) |
| Personas | **14 personas** — 8 base + 6 Korean-cultural (도사·무당·후배·선배·어머니·아버지) (§3.8) |
| Brand color | Primary `#F5C896` (peach/apricot), all mood colors **pastel** saturation (§1.6.2) |
| AI model | **OpenAI `gpt-4o-mini`** (or cheapest mini at build time) — cost/speed first (§4.6.7) |
| Channel | **Responsive web only.** No native app. PWA is v2. (§10) |
| Storage | `localStorage` with keys `ddalkkak:diaries:v1`, `ddalkkak:conversations:v1`, `ddalkkak:settings:v1` (§3.9) |
| One-per-day | 1 entry per date. Tapping an existing date opens that entry, not a new one. (§9) |

## Build-order plan (PRD §10.5) — pick the right tier before scaffolding

The PRD explicitly stages three implementations. **Confirm with the user which tier is in scope before generating code** — the right answer depends on whether this is Jay's personal v0, a beta, or production:

1. **Option A — single HTML file** (v0, ~1–2 days). Vanilla JS + CSS, Chart.js via CDN, direct `fetch` to OpenAI with a user-supplied API key in settings. Deploy as one static file.
2. **Option B — React 18 + Vite + Tailwind** (beta, ~1–2 weeks). Zustand or Context, React Router (history-stack gives free back-navigation that matches §2.1), Recharts, lucide-react. **Serverless proxy required** for OpenAI calls (Vercel Functions / Cloudflare Workers).
3. **Option C — Next.js + Supabase** (production). Auth, cloud sync, server-side AI calls, pgvector for future RAG.

## AI chat architecture (the non-obvious part)

This is the area most likely to be implemented wrong without reading the PRD:

- **Each conversation is a fully isolated session.** When a new chat starts, no prior conversation's messages are passed to the LLM. The context per call is exactly: `system prompt (persona) + serialized diary corpus + this session's messages only` (§4.6.5, §4.6.7).
- **Persona is locked at session start.** No mid-conversation persona switching. The UI must not even expose an entry point for it.
- **Past conversations are read-only** (`isClosed: true`). Mode D has no input box at all — it's intentionally disabled, not just hidden (§4.6.6).
- **Empty conversations (0 messages) are not persisted** when closed.
- **Cited diary chips**: assistant responses populate `citedDiaryIds`; tapping a chip routes to the diary editor for that entry.
- **API key safety**: Option A may take the key from a settings input (Jay's personal use only). Options B/C **must** proxy server-side — never ship a key in client code for beta/prod.

## Navigation model (PRD §2.1)

History-stack-based back navigation, not a fixed hierarchy. The same editor screen is reachable from calendar / list / AI-chat-citation, and back-navigation must return to the **originating** screen with its prior state (scroll position, selected month, sort order) preserved. Modals are not in the history stack — closing a modal returns to its parent screen.

## Editor screen is one screen, not two

New-entry and edit-entry share the **same component**. The only differences are initial data state (empty vs populated) and whether the delete action is visible (§4.3, §4.3.8). Do not split these into separate routes/components.

## Visual language constraints (PRD §1.6)

- Background `#FAF6EE` cream, body text `#2A2A2A` charcoal, **not** pure black/white.
- UI itself stays achromatic; color comes from mood icons and user photos. Primary `#F5C896` is used only for selected/active emphasis (today's date underline, active save state).
- Mood icons in MVP are standard emoji **as placeholders**. The component must be swappable for hand-painted watercolor illustrations later — keep them behind a single component boundary.
- Header icons are line icons inside a white circular container (44px container, 24px icon) — this is a recurring pattern across screens.
- Card radius 16–20px, shadow `y=2 blur=8 opacity=0.04` (very subtle).

## Working language

All product copy, mood labels, persona prompts, and UI strings are **Korean**. The PRD is Korean. Keep that language for any user-facing strings; English is fine for code identifiers, comments, and commit messages.

## UI 컴포넌트 재사용 규칙

새로운 UI 요소가 필요할 때 **무조건 새로 만들지 말 것.** 다음 순서를 따른다:

1. **디자인 시스템 폴더부터 확인.** 프로젝트에 정해진 컴포넌트 디렉토리(예: Option A는 HTML 내 `// ===== Components =====` 섹션 / Option B·C는 `src/components/ui/` 또는 `src/design-system/`)에서 동일·유사 컴포넌트가 이미 있는지 검색.
2. **있으면 그대로 재사용.** props로 변형 가능한 경우 props만 추가하고 기존 컴포넌트를 확장한다. 복붙·재작성 금지.
3. **유사하지만 안 맞으면 기존 컴포넌트를 일반화.** 두 사용처 모두 깨끗하게 쓸 수 있도록 prop을 추가하거나 variant를 늘려라 — 별도 비슷한 컴포넌트를 새로 만드는 것보다 낫다.
4. **정말 없을 때만 새로 만든다.** 새로 만들 때는 디자인 시스템 폴더 안에 만들고, [1.6 디자인 언어] 가이드(색·radius·shadow·터치 타깃 44×44)를 반드시 따른다. 일회용처럼 보여도 화면 외부 어딘가에 두지 말고 디자인 시스템에 등록한다 — 두 번째 사용처가 거의 항상 나타난다.

> 같은 시각 패턴(흰 원형 헤더 버튼, 흰 카드, 알약형 토스트, 무드 아이콘 등)이 PRD 전반에 반복된다. 매번 새로 만들면 톤이 흔들리고 파스텔/무채색 원칙이 무너진다.

## File size & responsibility rule

- **하나의 파일에는 하나의 기능만.** 한 파일은 한 가지 책임(컴포넌트, 훅, 스토어 슬라이스, 유틸 모듈 등)만 다룬다. 두 가지 책임이 섞이려 하면 그 시점에 파일을 나눈다.
- **100줄을 넘으면 분리한다.** 한 파일이 100줄을 넘기 시작하면 자연스러운 경계를 찾아 쪼개라 — 하위 컴포넌트 추출, 헬퍼를 별도 모듈로, 상수/타입을 별도 파일로, 등. 100줄은 강한 신호이지 절대선이 아니다(테이블·상수 데이터처럼 쪼개기 부자연스러운 경우는 예외). 단, "곧 다시 줄어들 테니 두자"는 미루기 금지 — 지금 분리한다.
- **Option A (단일 HTML)에서는 어떻게 적용하나**: 한 파일이라는 배포 제약은 유지하되, 내부적으로는 명확한 섹션 주석(`// ===== Calendar =====` 등)으로 기능 단위를 분리해 100줄 가이드를 *논리적*으로 지킨다. Option B/C로 넘어갈 때 그 섹션들이 그대로 파일로 분리되도록 설계.

# Project Instructions for Agentic Development

This repository uses a spec-first, contract-first, test-plan-first development workflow.

## Core Principles

1. Protect existing work.
   - Always inspect `git status` before modifying files.
   - Never overwrite unrelated user changes.
   - Never stage or commit unrelated files.

2. Prefer existing project patterns.
   - Reuse existing components, utilities, API clients, test helpers, validation patterns, and error handling conventions.
   - Do not introduce new frameworks, libraries, or abstractions unless the technical design explicitly justifies them.

3. Work from written artifacts.
   - Every major phase must produce a Markdown report under `.agent-state/`.
   - Do not rely only on conversation context for decisions.

4. Separate review from implementation.
   - Reviewer agents identify problems.
   - Developer agents fix problems.
   - Reviewers should not edit production code.

5. Enforce quality gates before release.
   - No commit or PR should be created unless tests, review, security review, and E2E checks have passed or the user explicitly requests a partial handoff.

## Per-change verification loop (MANDATORY)

Every code change — new feature, bug fix, refactor — follows this loop. **Do
not commit or push without completing it.**

1. **Write/update tests first.** New behavior → new unit test. Changed behavior →
   updated assertion. Bug fix → regression test that fails before the fix and
   passes after. If a change has no testable behavior at all (asset rename,
   pure docs), note it in the commit message.
2. **Run `npm run verify`** — chains typecheck → lint → vitest → next build.
   Single command, all four gates must pass.
3. **Fix loop.** If any gate fails, iterate (code change → re-run verify) until
   green. Do not skip a failing test by marking it `.skip` unless explicitly
   approved.
4. **E2E sanity** when the change touches a real user journey (auth, save,
   chat, picker, navigation): `npm run verify:full` (adds Playwright). For
   internal refactors that don't change the user surface, this is optional.
5. **Only after green** — git add, commit, push.

The shortcut commands:

```bash
npm run verify       # typecheck + lint + unit tests + build (always before commit)
npm run verify:full  # verify + Playwright e2e (for user-visible changes)
```

If a previously-passing test breaks because the underlying behavior moved on
purpose, **edit the test to match the new contract** — don't silence it. The
test file is part of the change, not separate from it.

## Standard Workflow

Use `/feature-flow <feature request>` for full feature implementation.

Default flow:

1. Git safety check
2. Requirement intake
3. Existing architecture analysis
4. Technical design
5. API/interface contract
6. Data model and migration review
7. Test plan
8. Implementation
9. Local verification
10. Code review
11. Security review
12. Fix loop
13. E2E validation
14. Release readiness and commit/PR

## Agent State Files

Agents should write their outputs to `.agent-state/`.

Expected files:

- `.agent-state/00-git-safety.md`
- `.agent-state/01-requirement-intake.md`
- `.agent-state/02-architecture-report.md`
- `.agent-state/03-technical-design.md`
- `.agent-state/04-api-contract.md`
- `.agent-state/05-db-migration-report.md`
- `.agent-state/06-test-plan.md`
- `.agent-state/07-implementation-report.md`
- `.agent-state/08-test-report.md`
- `.agent-state/09-code-review-report.md`
- `.agent-state/10-security-report.md`
- `.agent-state/11-performance-report.md`, only when relevant
- `.agent-state/12-infra-report.md`, only when relevant
- `.agent-state/13-e2e-report.md`
- `.agent-state/14-release-report.md`

## Report Verdict Format

Every gate report must end with one of these forms:

```md
## Verdict
PASS
```

or

```md
## Verdict
FAIL

## Blocking Issues
1. ...
```

For non-gating informational reports, use:

```md
## Verdict
INFO
```

## Fix Loop Rules

- Blocking issues must be fixed before release.
- Non-blocking suggestions may be deferred if they do not affect correctness, security, or maintainability.
- Run at most 3 repair cycles for the same issue.
- If the same issue persists after 3 cycles, stop and write a blocker summary to `.agent-state/blocker-report.md`.

## Local Verification

Before review gates, discover and run the relevant project commands.

Common examples:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Use the commands actually available in this repository.

## Commit and PR Rules

Do not commit or create a PR unless:

- Requirement intake is complete.
- Architecture analysis is complete.
- Technical design is complete.
- API/interface contract is complete, or explicitly not needed.
- DB/migration report is complete, or explicitly not needed.
- Test report is PASS.
- Code review report is PASS.
- Security review report is PASS.
- E2E report is PASS, or explicitly marked not applicable.
- No unrelated user changes are included.

Prefer PR creation for team repositories. Use direct commit only for local or explicitly requested workflows.
