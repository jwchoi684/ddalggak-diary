# Requirement Run

Requirement ID or file path:

```text
$ARGUMENTS
```

You are the orchestrator for implementing exactly one indexed requirement.

Your job is NOT to write code, write tests, or author reports yourself. Your job is to invoke specialized sub-agents per phase and stitch their outputs into a coherent workflow. Each phase below names the agent that owns it; you MUST invoke that agent rather than performing the work directly.

Do not implement other requirements.

## Delegation Discipline (MUST)

Each phase below is owned by a named sub-agent. The orchestrator MUST:

- Invoke the named agent via the Agent tool with `subagent_type` set to that agent's slug (e.g. `frontend-developer`, `code-reviewer`).
- Pass the requirement file path and relevant prior `.agent-state/*.md` reports as context in the prompt.
- Wait for the agent to write its report at the path the spec names.
- Read the report, check its Verdict, and decide whether to advance to the next phase.

The orchestrator MUST NOT:

- Read source files, write product code, run tests, or review the diff itself when an agent is named for that phase.
- Skip a named agent because "the requirement is small," "the result will be near-empty," or "I can do it faster."
- Author the gate report itself when an agent is named — the agent writes its own report.
- Silently consolidate multiple phases.

If an agent's domain genuinely does not apply to this requirement (e.g. `db-migration-agent` on a localStorage-only requirement, `e2e-tester` on a non-UI requirement), still invoke the agent. The agent itself writes a `PASS — not applicable` report with rationale. The orchestrator does not synthesize that report.

The orchestrator MAY:

- Compose each agent's prompt from the requirement file and prior reports.
- Stop the workflow at a hard FAIL.
- Update the requirement file's `## Status` field (`TODO` → `IN_PROGRESS` → `DONE`/`FAILED`).
- Update `.agent-state/requirements/index.md`.
- Run `git status` / `git diff` / `git branch --show-current` for the Phase 2 safety check.
- Copy/mirror an agent's gate report into the short-named path required by `scripts/quality-gate.sh` (e.g. `.agent-state/test-report.md`), preserving the agent's content verbatim.

### Read-only agents — orchestrator persists their output

Several agents are **read-only** (no `Edit` / `Write` tools): `architecture-analyzer`, `technical-design-agent`, `api-contract-agent`, `code-reviewer`, `security-reviewer`, `performance-reviewer`, `infra-reviewer`. They produce a report as their chat response but cannot persist it to disk themselves.

For those agents, the orchestrator's role is to:
1. Receive the agent's full report in the chat response.
2. Write it **verbatim** to the path the phase spec names (e.g. `.agent-state/02-architecture-report.md`).
3. Mirror to the short-name path if the quality gate requires one.

This is NOT a violation of delegation discipline — the agent did the work; the orchestrator is the persistence layer. The orchestrator must not edit, summarize, or "improve" the content during the write.

Read-write agents (`backend-developer`, `frontend-developer`, `db-migration-agent`, `test-engineer`, `e2e-tester`) write their own reports; the orchestrator only verifies file existence and Verdict.

Independence: agents do not share context across calls. The orchestrator's prompt is each agent's only input — include enough context (file paths, prior verdicts, CLAUDE.md constraints) for the agent to act without re-asking.

## Input Examples

```text
/requirement-run "REQ-001"
```

```text
/requirement-run ".agent-state/requirements/REQ-001.md"
```

## Phase 0. Locate Requirement

If `$ARGUMENTS` is an ID like `REQ-001`, read:

```text
.agent-state/requirements/REQ-001.md
```

If `$ARGUMENTS` is a path, read that file directly.

Also read:

```text
.agent-state/requirements/index.md
```

If the requirement is not found, stop and report the missing requirement.

## Phase 1. Check Requirement Status

Read the requirement status.

If status is `DONE`, stop and say it is already complete.

If status is `IN_PROGRESS`, continue only if the current git diff appears to be related to this requirement.

If status is `TODO` or `FAILED`, continue.

Update the requirement file status to:

```md
## Status
IN_PROGRESS
```

## Phase 2. Git Safety Check

Create `.agent-state/` if it does not exist.

Run:

```bash
git branch --show-current
git status --short
git diff --stat
```

Write or update:

```text
.agent-state/00-git-safety.md
```

Rules:

- Do not touch unrelated user changes.
- If unrelated changes exist in files this requirement needs to modify, stop and ask for direction.
- Do not stage or commit in this phase.

## Phase 3. Requirement Intake for This Requirement

Use `requirement-intake-agent`.

Input:

- The selected requirement file
- `.agent-state/requirements/index.md`
- Original docs file if referenced
- `.agent-state/00-git-safety.md`

Write:

```text
.agent-state/01-requirement-intake.md
```

Important:

- Scope must be limited to the selected requirement only.
- Do not include future requirements.
- Do not implement dependencies unless this requirement cannot work without them.

Gate:

- Continue only if verdict is PASS.

## Phase 4. Architecture Analysis

Use `architecture-analyzer`.

Input:

- Selected requirement file
- `.agent-state/01-requirement-intake.md`

Write:

```text
.agent-state/02-architecture-report.md
```

Gate:

- Continue only if verdict is PASS.

## Phase 5. Technical Design

Use `technical-design-agent`.

Input:

- Selected requirement file
- `.agent-state/01-requirement-intake.md`
- `.agent-state/02-architecture-report.md`

Write:

```text
.agent-state/03-technical-design.md
```

Gate:

- Continue only if verdict is PASS.

## Phase 6. API / Interface Contract

Use `api-contract-agent`.

Input:

- Selected requirement file
- `.agent-state/01-requirement-intake.md`
- `.agent-state/02-architecture-report.md`
- `.agent-state/03-technical-design.md`

Write:

```text
.agent-state/04-api-contract.md
```

If no API/interface change is required, write a PASS report explaining why.

## Phase 7. Data Model / Migration Review

Use `db-migration-agent` in REVIEW MODE.

Input:

- Selected requirement file
- `.agent-state/03-technical-design.md`
- `.agent-state/04-api-contract.md`

Write:

```text
.agent-state/05-db-migration-report.md
```

If no data change is required, write a PASS report explaining why.

## Phase 8. Test Plan

Use `test-engineer` in PLAN MODE.

Input:

- Selected requirement file
- `.agent-state/01-requirement-intake.md`
- `.agent-state/03-technical-design.md`
- `.agent-state/04-api-contract.md`
- `.agent-state/05-db-migration-report.md`

Write:

```text
.agent-state/06-test-plan.md
```

Gate:

- Continue only if verdict is PASS.

## Phase 9. Implementation

Use only relevant implementation agents.

Use `backend-developer` when this requirement affects:

- Backend APIs
- Services
- Validation
- Auth/permission
- Repositories
- Workers/jobs
- Server-side tests

Use `frontend-developer` when this requirement affects:

- UI
- Routes/pages
- Components
- Forms
- Client state
- API client usage
- Frontend tests

Use `db-migration-agent` in IMPLEMENT MODE only if the migration report says data changes are required.

Write:

```text
.agent-state/07-implementation-report.md
```

Rules:

- Implement only the selected requirement.
- Do not implement other indexed requirements.
- Do not silently change the API/interface contract.
- Do not perform unrelated refactors.
- Do not stage or commit files.

## Phase 10. Local Verification

Use `test-engineer` in IMPLEMENT AND VERIFY MODE.

Responsibilities:

- Add or update tests from the test plan.
- Run relevant verification commands.
- Write `.agent-state/08-test-report.md`.

Gate:

- If FAIL, route fixes to the responsible developer agent.
- Repeat implementation and verification.
- Stop after 3 failed repair cycles for the same issue.

## Phase 11. Code Review

Use `code-reviewer`.

Input:

- Current git diff
- Selected requirement file
- All `.agent-state/` reports

Write:

```text
.agent-state/09-code-review-report.md
```

Gate:

- If FAIL, route blocking issues to the responsible developer agent.
- Repeat implementation, verification, and review.
- Stop after 3 failed repair cycles for the same issue.

## Phase 12. Security Review

Use `security-reviewer`.

Input:

- Current git diff
- Selected requirement file
- `.agent-state/04-api-contract.md`
- `.agent-state/05-db-migration-report.md`
- `.agent-state/08-test-report.md`
- `.agent-state/09-code-review-report.md`

Write:

```text
.agent-state/10-security-report.md
```

Gate:

- If FAIL, route required fixes to the responsible developer agent.
- Repeat implementation through security review.
- Stop after 3 failed repair cycles for the same issue.

## Phase 13. Conditional Performance Review

Run only if the selected requirement affects:

- List/filter/search/sort/pagination
- Large data queries
- High traffic endpoints
- Caching
- Background jobs
- Batch processing
- Expensive rendering
- Build/startup/runtime performance

If relevant, use `performance-reviewer`.

Write:

```text
.agent-state/11-performance-report.md
```

If not relevant, write a PASS report explaining why.

## Phase 14. Conditional Infra Review

Run only if the selected requirement affects:

- Deployment
- CI/CD
- Environment variables
- Cloud resources
- Networking
- Observability
- Queues/workers
- Secrets/configuration
- Docker/build images
- Runtime process management

If relevant, use `infra-reviewer`.

Write:

```text
.agent-state/12-infra-report.md
```

If not relevant, write a PASS report explaining why.

## Phase 15. E2E Validation

Use `e2e-tester`.

Input:

- Selected requirement file
- `.agent-state/06-test-plan.md`
- `.agent-state/08-test-report.md`
- `.agent-state/09-code-review-report.md`
- `.agent-state/10-security-report.md`

Write:

```text
.agent-state/13-e2e-report.md
```

If E2E is not applicable for this requirement, write a PASS report explaining why.

## Phase 16. Requirement Completion

If all gates pass, update the selected requirement file:

```md
## Status
DONE
```

Add:

```md
## Completion Notes

## Files Changed

## Tests Run

## Review Result

## Security Result

## E2E Result

## Commit / PR
Not committed
```

Also update `.agent-state/requirements/index.md` and mark the requirement as `DONE`.

If any gate fails and cannot be fixed safely, update status to:

```md
## Status
FAILED
```

Write the blocker reason.

## Phase 17. Release Readiness

Use `release-manager`.

Input:

- Current git status
- Current git diff
- Selected requirement file
- All `.agent-state/` reports

Write:

```text
.agent-state/14-release-report.md
```

Do not commit unless the user explicitly requested commit and all gates passed.

## Final Response

Return:

- Requirement ID
- Requirement title
- Status: DONE / FAILED / BLOCKED
- Files changed
- Tests run
- Review result
- Security result
- E2E result
- Suggested next command

Example:

```text
REQ-001 is DONE.

Next recommended command:
/requirement-next
```