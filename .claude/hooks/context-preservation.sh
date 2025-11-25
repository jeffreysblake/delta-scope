#!/bin/bash
#
# SessionEnd Hook: Auto-save context before session ends
# Ensures context preservation doesn't depend on user remembering /whats-next
#

set -euo pipefail

# Ensure log directory exists
mkdir -p ".claude/logs"

output_file=".claude/logs/SESSION-LOG.md"
timestamp=$(date "+%Y-%m-%d %H:%M")
date_only=$(date "+%Y-%m-%d")

# Get git state
uncommitted_files=$(git status --porcelain 2>/dev/null | head -20 || echo "No git repo")
recent_commits=$(git log --oneline -5 2>/dev/null || echo "No commits")
current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")

# Get recent file changes
recent_changes=$(git diff --stat HEAD 2>/dev/null | tail -10 || echo "No changes")
staged_changes=$(git diff --cached --stat 2>/dev/null | tail -5 || echo "No staged changes")

# Count modified files by type
ts_files=$(git status --porcelain 2>/dev/null | grep -c "\.ts" || echo "0")
test_files=$(git status --porcelain 2>/dev/null | grep -c "test\." || echo "0")
config_files=$(git status --porcelain 2>/dev/null | grep -cE "\.(json|yaml|yml|toml)$" || echo "0")

# Check for TODOs added in this session
new_todos=$(git diff HEAD 2>/dev/null | grep -c "^\+.*TODO" || echo "0")

# Check test status (quick check)
test_status="unknown"
if [ -f "package.json" ]; then
  if npm test --silent 2>/dev/null; then
    test_status="passing"
  else
    test_status="failing"
  fi
fi

# Build session summary
session_entry="
---

## Session: $timestamp

**Branch:** $current_branch
**Test Status:** $test_status

### Files Modified
- TypeScript files: $ts_files
- Test files: $test_files
- Config files: $config_files
- New TODOs added: $new_todos

### Git State
\`\`\`
$uncommitted_files
\`\`\`

### Recent Commits
\`\`\`
$recent_commits
\`\`\`

### Suggested Next Steps
- Review uncommitted changes listed above
- Run tests: \`npm test\`
- Check TODOs: \`grep -r \"TODO\" src/ | head -10\`
- Review any failing tests before continuing
"

# Append to session log
echo "$session_entry" >> "$output_file"

# Keep session log manageable (last 50 sessions approx)
head -2000 "$output_file" > "$output_file.tmp" && mv "$output_file.tmp" "$output_file"

# Archive weekly (check if we need to archive)
week_num=$(date +%Y-W%V)
archive_file=".claude/logs/archive/$week_num.md"
mkdir -p ".claude/logs/archive"

# If it's a new week and archive doesn't exist, copy current log
if [ ! -f "$archive_file" ]; then
  # Check if log has entries from previous week
  prev_week=$(date -d "7 days ago" +%Y-W%V 2>/dev/null || date -v-7d +%Y-W%V 2>/dev/null || echo "")
  if [ -n "$prev_week" ] && [ "$prev_week" != "$week_num" ]; then
    prev_archive=".claude/logs/archive/$prev_week.md"
    if [ ! -f "$prev_archive" ]; then
      # Archive entries older than 7 days
      cp "$output_file" "$prev_archive" 2>/dev/null || true
    fi
  fi
fi

echo '{"result": "Session context auto-saved to SESSION-LOG.md"}'
