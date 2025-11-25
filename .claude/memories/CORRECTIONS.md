# Corrections & Learnings Log

This file tracks corrections, common issues, and learnings discovered during development. Claude should reference this file when encountering similar situations and update it when new patterns are discovered.

## File Size Violations

### Issue: Files exceeding 600 line limit
**When:** 2024-11-25
**Files affected:** database.ts (1500 lines), actionExecutor.ts (682 lines), scheduler.ts (615 lines)
**Solution:** Split into smaller, focused modules using composition pattern
- Extract related methods into sub-modules (e.g., `database/migrations.ts`, `database/scheduler.ts`)
- Create index.ts to re-export for backward compatibility
- Use delegation pattern to keep main class thin

### Pattern to avoid:
```typescript
// BAD: Monolithic class with everything
class BigService {
  // 1500 lines of methods...
}

// GOOD: Composition with sub-modules
class BigService {
  private subModule: SubModule;
  delegatedMethod() { this.subModule.method(); }
}
```

## Import/Export Issues

### Issue: Using `require()` instead of ES imports
**When:** 2024-11-25
**Files affected:** Dashboard.tsx
**Solution:** Always use ES module imports in TypeScript files
```typescript
// BAD
const { foo } = require('./module');

// GOOD
import { foo } from './module.js';
```

### Issue: Unused imports causing TypeScript errors
**When:** 2024-11-25
**Pattern:** After refactoring, always check for unused imports/variables
**Solution:** Run `npm run build` after any refactoring to catch TS6196 errors

## Type System Issues

### Issue: Type mismatch after module extraction
**When:** 2024-11-25
**Context:** QueuedRecommendation generic type vs specific type
**Solution:** Use type assertions when needed, or export types from shared location
```typescript
// When database returns generic but service expects specific type
this.queue = this.db.getItems() as SpecificType[];
```

## Test Patterns

### Issue: Tests using hardcoded strings that break with UI changes
**Pattern:** Footer tests checking for exact string like '/: Filter'
**Better approach:** Test for presence of key elements, not exact formatting

## React Patterns

### Issue: External functions in useCallback dependency arrays
**Context:** Functions imported from modules don't need to be in deps
**Pattern:** React hooks warn about outer scope values in dependency arrays
```typescript
// These warnings can often be ignored for imported functions
useCallback(() => {
  importedFunction(); // Not a dependency
}, [actualStateDependency]);
```

---

## How to Use This File

1. **Before starting work:** Review relevant sections for patterns to avoid
2. **When encountering issues:** Check if similar issue was logged here
3. **After fixing issues:** Add new learnings with date, context, and solution
4. **During reviews:** Verify new code doesn't repeat logged mistakes
