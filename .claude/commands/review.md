---
description: Run comprehensive automated review pipeline before commit
allowed-tools:
  - Task
  - Bash
  - Read
  - Grep
  - Glob
---

# Automated Review Pipeline

Run a comprehensive, automated review pipeline that orchestrates multiple agents and checks.

## Instructions

### Phase 1: Gather Context

1. **Identify changed files**:
   ```bash
   git diff --name-only HEAD
   git diff --cached --name-only
   ```

2. **Load relevant context**:
   - Read `.claude/context/patterns.md` for pattern validation
   - Read `.claude/context/gotchas.md` for known issues
   - Check file types to determine which checks apply

### Phase 2: Run Automated Checks

Execute these checks in sequence, collecting all findings:

1. **File Size Check**:
   ```bash
   wc -l <changed-files> | awk '$1 > 600 {print "BLOCKER: " $2 " has " $1 " lines (max 600)"}'
   ```

2. **Debug Statement Check**:
   ```bash
   grep -n "console.log\|debugger" <changed-files>
   ```

3. **Linting**:
   ```bash
   npm run lint 2>&1 | head -50
   ```

4. **Test Suite**:
   ```bash
   npm test 2>&1 | tail -30
   ```

5. **Coverage Check** (if available):
   ```bash
   npm run test:coverage 2>&1 | grep -E "Statements|Branches|Functions|Lines"
   ```

### Phase 3: Agent Reviews

Launch specialized agents for deep analysis:

1. **Meta-Reviewer Agent**:
   Use Task tool to invoke meta-reviewer agent:
   - Code quality validation
   - Pattern consistency (against patterns.md)
   - Security review
   - Test coverage verification

2. **Code-Reviewer Agent** (for significant changes):
   Use Task tool to invoke code-reviewer agent:
   - Architecture fit
   - Performance analysis
   - Documentation completeness

### Phase 4: Aggregate & Report

Compile all findings into a unified report:

```markdown
## Review Pipeline Results

### Summary
- Files reviewed: N
- Checks run: N
- Status: READY TO COMMIT / NEEDS CHANGES

### Blockers (Must Fix)
[List items that must be fixed before commit]

### Warnings (Should Fix)
[List items that should be addressed]

### Suggestions (Nice to Have)
[List optional improvements]

### Automated Checks
- [ ] File sizes under 600 lines
- [ ] No debug statements
- [ ] Linting passes
- [ ] Tests pass
- [ ] Coverage adequate

### Agent Findings
[Summary from meta-reviewer and code-reviewer]
```

### Phase 5: Auto-Fix Option

If user confirms, automatically fix what's possible:

```bash
# Fix linting
npm run lint -- --fix

# Fix formatting
npm run format 2>/dev/null || npx prettier --write <files>
```

## Quick Mode

If invoked with `--quick` argument, only run:
1. File size check
2. Debug statement check
3. Linting
4. Test pass/fail (not coverage)

Skip agent reviews for faster feedback.

## Exit Criteria

**READY TO COMMIT** requires:
- All blockers resolved
- Tests passing
- Linting clean
- No debug statements
- All files under 600 lines

**NEEDS CHANGES** if any:
- Blocker issues found
- Tests failing
- Linting errors (not warnings)
- Files over 600 lines
- Security concerns identified
