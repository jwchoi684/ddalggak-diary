#!/usr/bin/env python3
import json
import sys
import re
from pathlib import Path

payload = json.load(sys.stdin)
tool_input = payload.get("tool_input", {})
command = tool_input.get("command", "")

is_git_commit = re.search(r"\bgit\s+commit\b", command)
if not is_git_commit:
    sys.exit(0)

required = [
    ".agent-state/test-report.md",
    ".agent-state/review-report.md",
    ".agent-state/security-report.md",
    ".agent-state/e2e-report.md",
]

missing = [p for p in required if not Path(p).exists()]
if missing:
    print(
        json.dumps({
            "decision": "block",
            "reason": f"Block git commit. Missing required reports: {', '.join(missing)}"
        })
    )
    sys.exit(0)

for path in required:
    text = Path(path).read_text(errors="ignore")
    if "PASS" not in text:
        print(
            json.dumps({
                "decision": "block",
                "reason": f"Block git commit. {path} does not contain PASS."
            })
        )
        sys.exit(0)

sys.exit(0)