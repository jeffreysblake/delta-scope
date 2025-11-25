---
description: Record a learning, correction, or common issue pattern for future reference
argument-hint: [category] [description of learning]
allowed-tools:
  - Read
  - Edit
---

# Learn Command

Record corrections, common issues, and learnings discovered during development to `.claude/memories/CORRECTIONS.md`.

## Instructions

1. **Parse Arguments**:
   - If no arguments: Ask user what they learned and what category it falls under
   - Expected format: `category: description` or auto-detect from conversation

2. **Valid Categories**:
   - `file-size` - File organization and size violations
   - `import` - Import/export issues and ES module patterns
   - `type` - TypeScript type system issues
   - `test` - Testing patterns and issues
   - `react` - React-specific patterns and hooks
   - `git` - Git workflow issues
   - `refactor` - Refactoring patterns
   - `other` - General learnings

3. **Format Entry**:
   ```markdown
   ### Issue: [Brief title]
   **When:** [Current date]
   **Category:** [category]
   **Context:** [What was being done when this was discovered]
   **Solution:** [How it was resolved]
   **Pattern to avoid/follow:**
   ```code example if relevant```
   ```

4. **Append to CORRECTIONS.md**:
   - Read existing file
   - Find appropriate section based on category
   - Append new entry
   - Confirm addition to user

5. **Cross-Reference**:
   - If this relates to an existing pattern, link them
   - If this contradicts an existing entry, flag for review

## Example Usage

```
/learn import: Always use .js extensions in TypeScript ESM imports even for .ts files
```

Generates:
```markdown
### Issue: ESM import extensions required
**When:** 2024-11-25
**Category:** import
**Context:** Build failures due to missing .js extensions
**Solution:** Always use .js extensions in import statements for TypeScript ESM projects
**Pattern:**
```typescript
// BAD
import { foo } from './module';

// GOOD
import { foo } from './module.js';
```
```

## Auto-Detection

If invoked without arguments during or after fixing an issue, analyze the conversation to:
1. Identify what was fixed
2. Determine the category
3. Summarize the learning
4. Propose the entry for user confirmation
