#!/bin/bash
#
# PostToolUse Hook: Auto-lookup CORRECTIONS.md on errors
# Creates feedback loop where past fixes accelerate future debugging
#

set -euo pipefail

input=$(cat)
tool=$(echo "$input" | jq -r '.tool // ""')

# Only process Bash tool failures
if [[ "$tool" != "Bash" ]]; then
  exit 0
fi

exit_code=$(echo "$input" | jq -r '.result.exitCode // 0')

# Only process failures
if [[ "$exit_code" == "0" ]]; then
  exit 0
fi

output=$(echo "$input" | jq -r '.result.output // ""')
corrections_file=".claude/memories/CORRECTIONS.md"

# Check if corrections file exists
if [ ! -f "$corrections_file" ]; then
  exit 0
fi

# Extract key error terms from output (common error indicators)
error_terms=""

# TypeScript/JavaScript errors
if echo "$output" | grep -qiE "TypeError|ReferenceError|SyntaxError"; then
  error_terms+="TypeError|ReferenceError|SyntaxError|"
fi

# Common error patterns
if echo "$output" | grep -qiE "Cannot find|not found|undefined|null is not"; then
  error_terms+="Cannot find|not found|undefined|null|"
fi

# Import/module errors
if echo "$output" | grep -qiE "Cannot resolve|Module not found|import|export"; then
  error_terms+="import|export|module|resolve|"
fi

# Test failures
if echo "$output" | grep -qiE "FAIL|AssertionError|expected.*received|toBe|toEqual"; then
  error_terms+="test|mock|assertion|expected|"
fi

# Build errors
if echo "$output" | grep -qiE "Build failed|Compilation|tsc|error TS"; then
  error_terms+="build|compile|typescript|tsc|"
fi

# Remove trailing pipe
error_terms=${error_terms%|}

if [ -z "$error_terms" ]; then
  exit 0
fi

# Search corrections for matches (case insensitive, limit results)
matches=$(grep -iE "$error_terms" "$corrections_file" 2>/dev/null | head -15 || true)

if [ -n "$matches" ]; then
  # Format matches for display
  formatted_matches=$(echo "$matches" | sed 's/^/  /' | head -10)

  # Count total matches
  match_count=$(echo "$matches" | wc -l)

  message="📚 SIMILAR ISSUES IN CORRECTIONS.MD ($match_count matches)\n\n"
  message+="$formatted_matches\n\n"
  message+="💡 Check .claude/memories/CORRECTIONS.md for full context and solutions."

  # Escape for JSON
  escaped_message=$(echo -e "$message" | jq -Rs '.')

  cat << EOF
{
  "additionalContext": $escaped_message
}
EOF
fi
