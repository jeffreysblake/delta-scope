#!/bin/bash
#
# PostToolUse Hook: Error-triggered debugging guidance
# Runs after Bash tool usage when exit code is non-zero
#
# This hook provides informational guidance (not blocking) when:
# 1. Build failures (npm run build exits non-zero)
# 2. Test failures (npm test exits non-zero)
# 3. Lint errors
#

set -euo pipefail

# Read input from stdin
input=$(cat)

# Extract exit code and command from input
exit_code=$(echo "$input" | jq -r '.result.exitCode // 0')
command=$(echo "$input" | jq -r '.parameters.command // ""')
# stderr is in result.output for failed commands
output=$(echo "$input" | jq -r '.result.output // ""')

# If exit code is 0, no guidance needed
if [ "$exit_code" = "0" ]; then
  exit 0
fi

# Detect build/test/lint failures
if echo "$command" | grep -qE "npm (run )?(build|test|lint)|vitest|jest|eslint|tsc"; then
  # Determine error type
  error_type="Build/Test"
  if echo "$command" | grep -qE "npm (run )?test|vitest|jest"; then
    error_type="Test"
  elif echo "$command" | grep -qE "npm (run )?lint|eslint"; then
    error_type="Lint"
  elif echo "$command" | grep -qE "npm (run )?build|tsc"; then
    error_type="Build"
  fi

  # Extract first few lines of error for context (max 500 chars)
  error_preview=$(echo "$output" | head -20 | cut -c1-500)

  cat << EOF
{
  "additionalContext": "⚠️ ${error_type} FAILURE DETECTED\n\nCommand: ${command}\nExit code: ${exit_code}\n\n📋 Recommended actions:\n1. Use the debug-like-expert skill for systematic investigation:\n   - Invoke: Skill(debug-like-expert)\n   - Or run: /debug ${command} failed\n\n2. Check .claude/memories/CORRECTIONS.md for similar past issues\n\n3. Form a hypothesis before making changes\n\n---\nError preview:\n${error_preview}"
}
EOF
fi
