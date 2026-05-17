# Feature Flow

User request:

```text
$ARGUMENTS
```

You are the orchestrator for a full software development workflow.

Run the workflow in phases. Do not skip a phase unless it is clearly not applicable. If a phase is not applicable, write a short PASS report explaining why.

The target flow is:

```text
Git safety
→ Requirement intake
→ Architecture analysis
→ Technical design
→ API/interface contract
→ Data/migration review
→ Test plan
→ Implementation
→ Local verification
→ Code review
→ Security review
→ Conditional performance review
→ Conditional infra review
→ E2E validation
→ Release readiness
```

## Phase 0. Git Safety Check

Create `.agent-state/` if it does not exist.

Run:

```bash
git branch --show-current
git status --short
git diff --stat
```

Write `.agent-state/00-git-safety.md`.

Required format:

```md
# Git Safety Check

## Current Branch

## Existing Changes

## Unrelated User Changes

## Files That Must Not Be Touched

## Risk Assessment

## Verdict
PASS
```

Rules:

- If unrelated changes exist, avoid those files.
- If the task requires modifying files with unrelated changes, stop and ask for direction.
- Do not stage or commit anything in this phase.

## Phase 1. Requirement Intake

Use `requirement-intake-agent`.

Inputs:

- User request
- `.agent-state/00-git-safety.md`
- Relevant README/docs if useful

Required output:

```text
.agent-state/01-requirement-intake.md
```

The report must include:

- Feature summary
- User goal
- User stories, when useful
- Acceptance criteria
- Non-goals
- Edge cases
- Assumptions
- Blocking ambiguities
- Recommended scope
- Verdict

Gate:

- Continue only if the verdict is PASS.
- If FAIL, ask the smallest possible clarification question.

## Phase 2. Architecture Analysis

Use `architecture-analyzer`.

Inputs:

- User request
- `.agent-state/01-requirement-intake.md`

Required output:

```text
.agent-state/02-architecture-report.md
```

The agent must inspect:

- Frontend routes, pages, components, hooks, state, API clients
- Backend routes, controllers, resolvers, services, repositories
- Validation, error handling, logging, auth, permissions
- Database schema, models, migrations, relations, indexes
- Existing tests, fixtures, mocks, E2E tests
- Build, lint, typecheck, test, and CI scripts

Gate:

- Continue only if the verdict is PASS.

## Phase 3. Technical Design

Use `technical-design-agent`.

Inputs:

- `.agent-state/01-requirement-intake.md`
- `.agent-state/02-architecture-report.md`

Required output:

```text
.agent-state/03-technical-design.md
```

The design must define:

- Implementation strategy
- Frontend responsibilities
- Backend responsibilities
- Data/migration responsibilities
- Test responsibilities
- Files expected to change
- Implementation order
- Backward compatibility
- Risks and tradeoffs
- Whether performance review is needed
- Whether infra review is needed

Gate:

- Continue only if the verdict is PASS.

## Phase 4. API / Interface Contract

Use `api-contract-agent`.

Inputs:

- `.agent-state/01-requirement-intake.md`
- `.agent-state/02-architecture-report.md`
- `.agent-state/03-technical-design.md`

Required output:

```text
.agent-state/04-api-contract.md
```

The contract must define, when applicable:

- Endpoint, operation, function signature, event, CLI, or schema
- Request/input shape
- Response/output shape
- Validation rules
- Error handling
- Auth/permission rules
- Compatibility notes
- Examples

If no API/interface contract is needed, the report must explicitly say so and end with PASS.

## Phase 5. Data Model / Migration Review

Use `db-migration-agent` in REVIEW MODE.

Inputs:

- `.agent-state/01-requirement-intake.md`
- `.agent-state/02-architecture-report.md`
- `.agent-state/03-technical-design.md`
- `.agent-state/04-api-contract.md`

Required output:

```text
.agent-state/05-db-migration-report.md
```

The report must cover:

- Whether schema changes are required
- Migration strategy
- Backfill/default/nullability requirements
- Index requirements
- Existing data compatibility
- Rollback considerations
- Query performance risk
- Test requirements

If no data changes are needed, the report must explicitly say so and end with PASS.

## Phase 6. Test Plan

Use `test-engineer` in PLAN MODE.

Inputs:

- `.agent-state/01-requirement-intake.md`
- `.agent-state/02-architecture-report.md`
- `.agent-state/03-technical-design.md`
- `.agent-state/04-api-contract.md`
- `.agent-state/05-db-migration-report.md`

Required output:

```text
.agent-state/06-test-plan.md
```

The test plan must include:

- Unit tests
- Integration tests
- E2E tests
- Regression tests
- Security-relevant tests
- Fixtures and mocks
- Commands to run
- Not applicable tests

Gate:

- Continue only if the verdict is PASS.

## Phase 7. Implementation

Use only the relevant implementation agents.

Use `backend-developer` when the change affects:

- Backend APIs
- Services/use cases
- Validation
- Auth/permission logic
- Repositories/data access
- Jobs/workers
- Server-side tests

Use `frontend-developer` when the change affects:

- UI
- Routes/pages
- Components
- Forms
- Client state
- API client usage
- Frontend tests

Use `db-migration-agent` in IMPLEMENT MODE only when `.agent-state/05-db-migration-report.md` says data changes are required.

Implementation must follow:

- `.agent-state/01-requirement-intake.md`
- `.agent-state/03-technical-design.md`
- `.agent-state/04-api-contract.md`
- `.agent-state/05-db-migration-report.md`
- `.agent-state/06-test-plan.md`

Required output:

```text
.agent-state/07-implementation-report.md
```

Rules:

- Do not broaden scope.
- Do not silently change the contract.
- Do not perform unrelated refactors.
- Do not stage or commit files.

## Phase 8. Local Verification

Use `test-engineer` in IMPLEMENT AND VERIFY MODE.

Responsibilities:

- Add or update tests from the test plan.
- Run relevant verification commands.
- Capture test results and failures.
- Write `.agent-state/08-test-report.md`.

Gate:

- If FAIL, route the issue to the responsible developer agent.
- Repeat Phase 7 and Phase 8.
- Stop after 3 failed repair cycles for the same issue.

## Phase 9. Code Review

Use `code-reviewer`.

Inputs:

- Current git diff
- All reports so far

Required output:

```text
.agent-state/09-code-review-report.md
```

Rules:

- The code reviewer must not edit files.
- Blocking issues must be fixed before continuing.

Gate:

- If FAIL, route blocking issues to the responsible developer agent.
- Repeat Phase 7 through Phase 9.
- Stop after 3 failed repair cycles for the same issue.

## Phase 10. Security Review

Use `security-reviewer`.

Inputs:

- Current git diff
- `.agent-state/04-api-contract.md`
- `.agent-state/05-db-migration-report.md`
- `.agent-state/08-test-report.md`
- `.agent-state/09-code-review-report.md`

Required output:

```text
.agent-state/10-security-report.md
```

Rules:

- The security reviewer must not edit files.
- Critical, High, and required Medium issues must be fixed before continuing.

Gate:

- If FAIL, route required fixes to the responsible developer agent.
- Repeat Phase 7 through Phase 10.
- Stop after 3 failed repair cycles for the same issue.

## Phase 11. Conditional Performance Review

Run this phase only if the change affects:

- List/filter/search/sort/pagination
- Large data queries
- High traffic endpoints
- Caching
- Background jobs
- Batch processing
- Expensive rendering
- Build/startup/runtime performance

If relevant, use `performance-reviewer`.

Required output:

```text
.agent-state/11-performance-report.md
```

If not relevant, write:

```md
# Performance Review

No performance review is required for this change.

## Verdict
PASS
```

Gate:

- If FAIL, route blocking issues to the responsible developer agent.

## Phase 12. Conditional Infra Review

Run this phase only if the change affects:

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

Required output:

```text
.agent-state/12-infra-report.md
```

If not relevant, write:

```md
# Infra Review

No infra review is required for this change.

## Verdict
PASS
```

Gate:

- If FAIL, route blocking issues to the responsible developer agent.

## Phase 13. E2E Validation

Use `e2e-tester`.

Inputs:

- `.agent-state/01-requirement-intake.md`
- `.agent-state/06-test-plan.md`
- `.agent-state/08-test-report.md`
- `.agent-state/09-code-review-report.md`
- `.agent-state/10-security-report.md`

Required output:

```text
.agent-state/13-e2e-report.md
```

Responsibilities:

- Identify the most important user journey.
- Use existing E2E framework if present.
- Add or update E2E tests when appropriate.
- Run focused E2E validation when practical.
- Document any skipped E2E checks with reasons.

Gate:

- If FAIL, route issue to responsible developer agent.
- Repeat Phase 7 through Phase 13.
- Stop after 3 failed repair cycles for the same issue.

## Phase 14. Release Readiness

Use `release-manager`.

Inputs:

- Current git status
- Current git diff
- All `.agent-state/` reports

Required output:

```text
.agent-state/14-release-report.md
```

Responsibilities:

- Verify required reports exist.
- Verify required reports have PASS.
- Verify no unrelated changes are included.
- Prepare commit message.
- Prepare PR body.
- Commit only when explicitly appropriate and all gates pass.

Final response must include:

- What changed
- Files changed
- Tests run
- Code review result
- Security result
- E2E result
- Commit hash or PR-ready summary
- Remaining risks, if any