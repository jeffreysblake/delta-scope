---
description: Run meta-review validation on recent changes before committing
allowed-tools:
  - Task
  - Read
  - Grep
  - Glob
  - Bash
---

# Meta-Review Command

Validate AI-generated changes before committing.

## Instructions

1. **Identify changed files**:
   ```bash
   git diff --name-only HEAD
   git diff --cached --name-only
   ```

2. **Launch meta-reviewer agent**:
   Use the Task tool to invoke the meta-reviewer agent with:
   - List of changed files
   - Request for comprehensive review

3. **Report findings**:
   - Summarize critical issues (must fix)
   - List warnings (should consider)
   - Provide recommendation (APPROVE / NEEDS CHANGES)

4. **Handle outcome**:
   - **APPROVE**: Confirm ready to commit
   - **NEEDS CHANGES**: List specific actions needed, offer to fix automatically

## Quick Mode

If invoked with `--quick` argument, only check:
- Debug statements
- File sizes
- Linting errors

Skip detailed pattern and security review.

## Integration

This command is automatically invoked before commits when the pre-commit hook is enabled.

To enable automatic review:
```bash
# In .git/hooks/pre-commit or via husky
claude-code /meta-review --quick
```
