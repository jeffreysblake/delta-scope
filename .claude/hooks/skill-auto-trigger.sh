#!/bin/bash
#
# PostToolUse Hook: Auto-trigger skills based on context
# Makes skills proactive guardrails instead of manual checklists
#

set -euo pipefail

input=$(cat)
tool=$(echo "$input" | jq -r '.tool // ""')
file_path=$(echo "$input" | jq -r '.parameters.file_path // ""')
command=$(echo "$input" | jq -r '.parameters.command // ""')

# Track triggered skills to avoid duplicates in output
triggered_skills=""
context_messages=""

# ============================================
# TEST-INTEGRITY: Auto-trigger when editing test files
# ============================================
if [[ "$tool" == "Edit" && "$file_path" == *".test."* ]] || \
   [[ "$tool" == "Edit" && "$file_path" == *"__tests__"* ]] || \
   [[ "$tool" == "Edit" && "$file_path" == *".spec."* ]]; then
  triggered_skills+="test-integrity "
  context_messages+="🧪 TEST-INTEGRITY ACTIVE\n"
  context_messages+="You're editing a test file. Remember:\n"
  context_messages+="• Tests define correct behavior - code must match tests\n"
  context_messages+="• NEVER weaken assertions to make tests pass\n"
  context_messages+="• If test fails, fix the CODE not the test\n"
  context_messages+="• Valid test changes: requirements changed, test was wrong, improving quality\n\n"
fi

# ============================================
# BUILD-VERIFICATION: Auto-trigger before test commands
# ============================================
if [[ "$tool" == "Bash" ]]; then
  if echo "$command" | grep -qE "npm test|npm run test|vitest|jest|pytest|go test|cargo test|make test"; then
    triggered_skills+="build-verification "
    context_messages+="🔨 BUILD-VERIFICATION ACTIVE\n"
    context_messages+="Before running tests, verify:\n"
    context_messages+="1. Dependencies installed? (npm install, pip install, etc.)\n"
    context_messages+="2. Code built? (npm run build, tsc, go build, etc.)\n"
    context_messages+="3. Build passed without errors?\n"
    context_messages+="Skip only if you JUST ran build successfully.\n\n"
  fi
fi

# ============================================
# TUI-EXPERT: Auto-trigger when editing TUI components
# ============================================
if [[ "$tool" == "Edit" && "$file_path" == *"src/components/"* ]] || \
   [[ "$tool" == "Edit" && "$file_path" == *"cli.tsx"* ]] || \
   [[ "$tool" == "Edit" && "$file_path" == *"app.tsx"* ]]; then
  triggered_skills+="tui-expert "
  context_messages+="🖥️ TUI-EXPERT ACTIVE\n"
  context_messages+="You're editing TUI components. Remember:\n"
  context_messages+="• Ink uses Yoga/flexbox - default flexDirection is 'row'\n"
  context_messages+="• Borders add to dimensions, use width='100%' carefully\n"
  context_messages+="• Test with ink-testing-library: lastFrame(), stdin.write()\n"
  context_messages+="• Common issues: ghost frames on startup, flickering, overflow\n"
  context_messages+="• See .claude/skills/tui-expert/SKILL.md for patterns\n\n"
fi

# ============================================
# PROPER-SOLUTIONS: Detect quick-fix language patterns
# ============================================
# This triggers based on output patterns - checking if previous response contained shortcuts
# Note: This is informational since we can't see our own previous output in hooks

# ============================================
# PERSISTENCE: Detect task complexity indicators
# ============================================
if [[ "$tool" == "Bash" ]]; then
  exit_code=$(echo "$input" | jq -r '.result.exitCode // 0')
  # After 3+ consecutive failures, remind about persistence
  failure_log=".claude/logs/failure-streak.log"

  if [ "$exit_code" != "0" ]; then
    echo "$(date +%s)" >> "$failure_log" 2>/dev/null || true
    recent_failures=$(tail -10 "$failure_log" 2>/dev/null | wc -l || echo "0")

    if [ "$recent_failures" -ge 3 ]; then
      triggered_skills+="persistence "
      context_messages+="💪 PERSISTENCE ACTIVE\n"
      context_messages+="Multiple failures detected. Remember:\n"
      context_messages+="• Complex problems require systematic investigation\n"
      context_messages+="• Don't switch approaches after one failure\n"
      context_messages+="• Form hypothesis → test → verify\n"
      context_messages+="• If it's hard, that's WHY you're doing it\n\n"
    fi
  else
    # Reset failure streak on success
    : > "$failure_log" 2>/dev/null || true
  fi
fi

# ============================================
# Output triggered skills context
# ============================================
if [ -n "$triggered_skills" ]; then
  # Escape for JSON
  escaped_context=$(echo -e "$context_messages" | jq -Rs '.')

  cat << EOF
{
  "additionalContext": $escaped_context
}
EOF
fi
