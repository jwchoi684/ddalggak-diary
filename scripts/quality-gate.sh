#!/usr/bin/env bash
set -euo pipefail

required_files=(
  ".agent-state/architecture-report.md"
  ".agent-state/test-report.md"
  ".agent-state/review-report.md"
  ".agent-state/security-report.md"
  ".agent-state/e2e-report.md"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "QUALITY_GATE_FAIL: Missing $file"
    exit 2
  fi
done

grep -q "PASS" .agent-state/test-report.md || {
  echo "QUALITY_GATE_FAIL: Tests did not pass"
  exit 2
}

grep -q "PASS" .agent-state/review-report.md || {
  echo "QUALITY_GATE_FAIL: Code review did not pass"
  exit 2
}

grep -q "PASS" .agent-state/security-report.md || {
  echo "QUALITY_GATE_FAIL: Security review did not pass"
  exit 2
}

grep -q "PASS" .agent-state/e2e-report.md || {
  echo "QUALITY_GATE_FAIL: E2E did not pass"
  exit 2
}

echo "QUALITY_GATE_PASS"