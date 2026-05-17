# Review Gate

Review the current diff without starting a new feature workflow.

Review scope:

```text
$ARGUMENTS
```

Use this command when code has already been changed and the goal is to verify whether it is safe to commit or open a PR.

## Phase 0. Git Safety

Create `.agent-state/` if it does not exist.

Run:

```bash
git branch --show-current
git status --short
git diff --stat
```

Write:

```text
.agent-state/00-git-safety.md
```

## Phase 1. Architecture Context

Use `architecture-analyzer`.

The goal is not to perform a full feature discovery. The goal is to understand the changed areas and relevant existing patterns.

Write:

```text
.agent-state/02-architecture-report.md
```

## Phase 2. Test Verification

Use `test-engineer` in VERIFY CURRENT DIFF MODE.

Responsibilities:

- Inspect changed files.
- Identify relevant tests.
- Add missing tests only if clearly needed and low-risk.
- Run relevant verification commands.
- Write test result.

Write:

```text
.agent-state/08-test-report.md
```

## Phase 3. Code Review

Use `code-reviewer`.

Write:

```text
.agent-state/09-code-review-report.md
```

## Phase 4. Security Review

Use `security-reviewer`.

Write:

```text
.agent-state/10-security-report.md
```

## Phase 5. Conditional Performance Review

Use `performance-reviewer` only if the diff affects performance-sensitive areas.

If not relevant, write:

```md
# Performance Review

No performance review is required for this diff.

## Verdict
PASS
```

Write:

```text
.agent-state/11-performance-report.md
```

## Phase 6. Conditional Infra Review

Use `infra-reviewer` only if the diff affects deployment, CI/CD, config, secrets, cloud resources, or runtime infrastructure.

If not relevant, write:

```md
# Infra Review

No infra review is required for this diff.

## Verdict
PASS
```

Write:

```text
.agent-state/12-infra-report.md
```

## Phase 7. Release Readiness

Use `release-manager`.

Write:

```text
.agent-state/14-release-report.md
```

Final response must include:

- Overall PASS/FAIL
- Blocking issues
- Tests run
- Security findings
- Performance/infra status
- Recommended next action