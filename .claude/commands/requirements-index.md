---
description: Read a requirements document and split it into atomic requirement files under .agent-state/requirements.
argument-hint: <requirements-document-path>
allowed-tools: Read, Write, Glob, Grep, Bash
model: sonnet
---

# Requirements Index

Requirements document path:

```text
$ARGUMENTS
```

You are the requirements indexing orchestrator.

Your job is to read the given requirements document and actually create requirement files under:

```text
.agent-state/requirements/
```

This command must create files. Do not only summarize the requirements in the chat.

## Critical Rules

1. You must read the requirements document from `$ARGUMENTS`.
2. You must create `.agent-state/requirements/` if it does not exist.
3. You must write one Markdown file per atomic requirement.
4. You must write `.agent-state/requirements/index.md`.
5. You must verify that the files were created before giving the final response.
6. Do not implement any requirement in this command.
7. Do not edit production source code.
8. Do not stage or commit files.

## Phase 0. Normalize Input

The user may pass the path with or without quotes.

Examples:

```text
docs/requirements.md
"docs/requirements.md"
```

Treat `$ARGUMENTS` as the requirements document path.

If the argument contains extra instruction text, extract the file path first.

Expected common path:

```text
docs/requirements.md
```

## Phase 1. Validate the Requirements Document

Use read-only commands to confirm the file exists.

Run:

```bash
test -f "$ARGUMENTS" && echo "FOUND" || echo "MISSING"
```

If shell quoting is difficult because `$ARGUMENTS` contains quotes or extra text, inspect the likely path manually using Read or Glob.

If the file does not exist:

1. Stop.
2. Tell the user the file was not found.
3. Do not create empty requirement files.

## Phase 2. Read the Document

Read the full requirements document.

Identify:

- Product area
- Feature areas
- Functional requirements
- Non-functional requirements
- Constraints
- Dependencies
- User roles
- Edge cases
- Acceptance criteria
- Open questions

## Phase 3. Create the Output Directory

Create the directory:

```bash
mkdir -p .agent-state/requirements
```

After creating it, verify it exists:

```bash
test -d .agent-state/requirements && echo "DIRECTORY_READY"
```

Do not continue unless the directory exists.

## Phase 4. Split Requirements into Atomic Units

Split the document into small, independently implementable requirements.

A good requirement unit should be:

- Small enough to implement in one focused change.
- Independently testable.
- Clearly tied to acceptance criteria.
- Safe to review as one PR or commit.
- Not mixed with unrelated behavior.

Avoid creating a requirement that combines unrelated frontend, backend, database, and E2E work unless they are tightly coupled and cannot be separated safely.

## Phase 5. Assign Requirement IDs

Create sequential requirement IDs:

```text
REQ-001
REQ-002
REQ-003
...
```

For each requirement, determine:

- Title
- Source section
- Summary
- User goal
- Acceptance criteria
- Non-goals
- Dependencies
- Suggested scope
- Expected affected areas
- Risk level
- Suggested test coverage
- Notes
- Status

Initial status must be:

```text
TODO
```

## Phase 6. Write Requirement Files

For each requirement, write one file:

```text
.agent-state/requirements/REQ-001.md
.agent-state/requirements/REQ-002.md
.agent-state/requirements/REQ-003.md
```

Each file must use this exact structure:

```md
# REQ-001: <Title>

## Status
TODO

## Source
<Original document path and section>

## Summary

## User Goal

## Acceptance Criteria

## Non-Goals

## Dependencies

## Suggested Scope

## Expected Affected Areas

- Frontend:
- Backend:
- Database:
- Tests:
- E2E:
- Infra:

## Risk Level
Low / Medium / High

## Suggested Test Coverage

## Notes
```

Rules:

- Use `REQ-001`, `REQ-002`, etc. exactly.
- Do not skip numbers.
- Do not put multiple unrelated requirements in one file.
- If a requirement depends on another, write the dependency explicitly.

## Phase 7. Write the Index File

Write:

```text
.agent-state/requirements/index.md
```

Use this exact structure:

```md
# Requirements Index

Source document: <requirements document path>

## Summary

## Requirement List

| ID | Title | Status | Dependencies | Risk |
|---|---|---|---|---|
| REQ-001 | ... | TODO | None | Low |
| REQ-002 | ... | TODO | REQ-001 | Medium |

## Recommended Execution Order

1. REQ-001
2. REQ-002
3. REQ-003

## High-Risk Requirements

## Notes
```

## Phase 8. Verify Files Were Created

Before the final response, run:

```bash
ls -la .agent-state/requirements
```

Then verify:

1. `.agent-state/requirements/index.md` exists.
2. At least one `REQ-XXX.md` file exists.
3. Each created requirement file has `## Status` with `TODO`.
4. The index lists the same requirement IDs as the files.

If verification fails:

1. Fix the missing files.
2. Re-run verification.
3. Do not give the final response until the files exist.

## Phase 9. Final Response

The final response must include:

- Source document path
- Number of requirement files created
- Requirement IDs created
- Recommended execution order
- Verification result
- Next command to run

Use this format:

```text
Created requirement index from docs/requirements.md.

Files created:
- .agent-state/requirements/index.md
- .agent-state/requirements/REQ-001.md
- .agent-state/requirements/REQ-002.md

Recommended next command:
/requirement-run "REQ-001"
```