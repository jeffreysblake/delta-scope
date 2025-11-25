#!/bin/bash
#
# PostToolUse Hook: Track recurring errors and suggest gotchas
# Creates self-improving system that identifies patterns automatically
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

# Extract error signature (first distinctive error line)
error_sig=$(echo "$output" | grep -oE "(Error|TypeError|Cannot|undefined|Failed|FAIL|error\[).*" | head -1 | cut -c1-80)

if [ -z "$error_sig" ]; then
  exit 0
fi

# Ensure log directory exists
mkdir -p ".claude/logs"
error_log=".claude/logs/error-frequency.log"

# Create log file if doesn't exist
touch "$error_log"

# Create a hash of the error signature for comparison (normalize whitespace)
error_hash=$(echo "$error_sig" | tr -s ' ' | md5sum | cut -c1-16)

# Log error occurrence with hash and timestamp
echo "$(date +%Y-%m-%d-%H:%M) | $error_hash | $error_sig" >> "$error_log"

# Keep log file manageable (last 100 entries)
tail -100 "$error_log" > "$error_log.tmp" && mv "$error_log.tmp" "$error_log"

# Check frequency of this specific error (same hash in last 50 entries)
count=$(tail -50 "$error_log" | grep -c "$error_hash" || echo "0")

if [ "$count" -ge 3 ]; then
  # Get timestamps of occurrences
  occurrences=$(tail -50 "$error_log" | grep "$error_hash" | cut -d'|' -f1 | tail -3 | tr '\n' ', ' | sed 's/,$//')

  message="🔄 RECURRING ERROR DETECTED (${count}x)\n\n"
  message+="Error pattern:\n  $error_sig\n\n"
  message+="Recent occurrences: $occurrences\n\n"
  message+="📝 Recommended actions:\n"
  message+="1. Add to .claude/context/gotchas.md with solution\n"
  message+="2. Use /learn to record fix in CORRECTIONS.md\n"
  message+="3. Consider creating a prevention hook\n"
  message+="4. Check if this indicates a systemic issue\n"

  # Escape for JSON
  escaped_message=$(echo -e "$message" | jq -Rs '.')

  cat << EOF
{
  "additionalContext": $escaped_message
}
EOF
fi
