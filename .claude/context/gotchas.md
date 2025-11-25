# Gotchas and Known Issues

Common issues encountered in delta-scope development and their solutions.

## Testing

### ESM Mock Order Matters
**Problem**: Mocks don't work when defined after imports.
**Solution**: Always define `vi.mock()` calls BEFORE importing the module under test.

```typescript
// ✅ Correct
vi.mock('../dependency.js');
import { myFunction } from '../module.js';

// ❌ Wrong - mock won't work
import { myFunction } from '../module.js';
vi.mock('../dependency.js');
```

### Missing Mock Functions
**Problem**: Tests fail silently when a mocked module doesn't include all methods.
**Example**: gitScanner tests failed because `lstat` wasn't mocked alongside `readdir` and `stat`.
**Solution**: Check all fs/promises methods used by the module and mock them all.

### Dashboard Component Mocks
**Problem**: Dashboard.test.tsx needs extensive service mocks.
**Required mocks**:
```typescript
vi.mock('../../services/database.js', () => ({
  getDatabaseService: vi.fn(() => ({
    recordAccess: vi.fn(),
    recordSearch: vi.fn(),
    getSearchHistory: vi.fn(() => []),
    getFrecencyScore: vi.fn(() => 100),
    getRepoStats: vi.fn(() => ({ lastAccessed: Date.now(), accessCount: 1, actions: {} })),
    getDismissedRecommendations: vi.fn(() => []),
    disableRepo: vi.fn(),
    enableRepo: vi.fn(),
    cleanupOldHistory: vi.fn(), // Don't forget this one!
  })),
  closeDatabaseService: vi.fn(),
}));

vi.mock('../../services/configValidator.js', () => ({
  validateConfig: vi.fn(() => ({ issues: [] })), // Must return { issues: [] }, not []
}));
```

### Integration Tests and /tmp
**Problem**: Integration tests create temp directories in /tmp which may be excluded.
**Solution**: Don't add `/tmp/` to system directory exclusions in gitScanner.

## Git Scanning

### Nested Repos (Monorepo Support)
**Behavior**: gitScanner intentionally finds nested .git directories.
**Reason**: Monorepos may have packages with their own .git folders.
**Test expectation**: Tests should expect nested repos to be found, not excluded.

### System Directories
**Excluded paths**: `/proc/`, `/sys/`, `/dev/`, `/run/`
**NOT excluded**: `/tmp/` (users may have repos there)

## React/Ink

### useInput in Tests
**Problem**: stdin.write() in tests may not trigger useInput immediately.
**Solution**: Always wrap state checks in `vi.waitFor()`:

```typescript
stdin.write('j'); // Navigate down
await vi.waitFor(() => {
  expect(lastFrame()).toContain('expected content');
});
```

### Error Boundaries
**Problem**: Component errors show in stderr but tests may still pass.
**Solution**: Check stderr output in test for "error occurred in component" messages.

## Build

### .js Extensions Required
**Problem**: ESM requires explicit file extensions in imports.
**Solution**: Always use `.js` extension even for TypeScript files:

```typescript
import { something } from './module.js'; // Not './module' or './module.ts'
```

### Type-Only Imports
**Problem**: Importing types can cause runtime issues in ESM.
**Solution**: Use `import type` for type-only imports:

```typescript
import type { GitRepo } from '../types/index.js';
```

## Configuration

### validateConfig Return Type
**Expected**: `{ issues: ValidationIssue[] }`
**Not**: `ValidationIssue[]`
**Error if wrong**: "Cannot read properties of undefined (reading 'length')"

### Database Service Mock Completeness
**Problem**: Dashboard tests fail if database mock is missing methods.
**Current required methods**:
```typescript
vi.mock('../../services/database.js', () => ({
  getDatabaseService: vi.fn(() => ({
    recordAccess: vi.fn(),
    recordSearch: vi.fn(),
    getSearchHistory: vi.fn(() => []),
    getFrecencyScore: vi.fn(() => 100),
    getRepoStats: vi.fn(() => ({ lastAccessed: Date.now(), accessCount: 1, actions: {} })),
    getDismissedRecommendations: vi.fn(() => []),
    disableRepo: vi.fn(),
    enableRepo: vi.fn(),
    cleanupOldHistory: vi.fn(),  // IMPORTANT: Often forgotten!
  })),
  closeDatabaseService: vi.fn(),
}));
```
**Error if missing**: Component crashes with "X is not a function", React error boundary catches it.
