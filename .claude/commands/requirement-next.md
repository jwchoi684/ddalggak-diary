# Requirement Next

Process the next pending requirement from the indexed requirements queue.

Optional instruction:

```text
$ARGUMENTS
```

You are the orchestrator for selecting and implementing the next pending requirement.

## Phase 0. Read Requirement Queue

Read:

```text
.agent-state/requirements/index.md
```

If the index does not exist, stop and tell the user to run:

```text
/requirements-index "docs/requirements.md"
```

## Phase 1. Select Next Requirement

Find the first requirement with status:

```text
TODO
```

Selection rules:

1. Respect the recommended execution order.
2. Do not select a requirement whose dependencies are not DONE.
3. Prefer lower-risk foundational requirements first.
4. If `$ARGUMENTS` includes a priority instruction, consider it only if dependencies are satisfied.

If no TODO requirement exists, report that all requirements are complete.

## Phase 2. Confirm Selected Requirement

Read the selected requirement file:

```text
.agent-state/requirements/REQ-XXX.md
```

Summarize:

- Requirement ID
- Title
- Dependencies
- Expected affected areas
- Risk level

## Phase 3. Implement Selected Requirement

Now execute the same workflow as `/requirement-run` for this selected requirement.

### Delegation Discipline (MUST READ FIRST)

`/requirement-run` is an **orchestrator workflow**, not a personal to-do list. **Read `.claude/commands/requirement-run.md` fully before proceeding** — it names the sub-agent that owns each phase, and the orchestrator MUST invoke that agent via the Agent tool rather than doing the work directly.

The orchestrator does NOT:
- Read source / write code / run tests / review diff itself for any phase that names an agent.
- Skip a named agent because "the requirement is small" or "the result will be near-empty." If a domain doesn't apply, the agent itself writes a `PASS — not applicable` report.
- Author gate reports itself when an agent is named.

The orchestrator DOES:
- Compose each agent's prompt from the requirement file + prior reports.
- Read each agent's report, check Verdict, gate on PASS/FAIL.
- Update the requirement file's Status and the index file.
- Mirror agent gate reports into the short-named paths required by `scripts/quality-gate.sh` after each successful gate phase.

### Other rules

- Implement only this selected requirement.
- Do not implement future requirements.
- Do not combine multiple requirements.
- Do not commit unless explicitly requested.
- Update status to DONE only if all gates pass.

## Final Response

Return:

- Requirement processed
- Status
- Files changed
- Tests run
- Review/security/E2E status
- Next pending requirement, if any

Example:

```text
Processed REQ-002: Add order status filter.

Status: DONE

Next pending requirement:
REQ-003: Add export button

Run:
/requirement-next
```