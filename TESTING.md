# Testing delta-scope

## Overview

delta-scope uses **Vitest** for testing and **ink-testing-library** for TUI component testing.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with UI (web interface)
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Organization

```
src/
├── components/
│   ├── Dashboard.tsx
│   └── __tests__/
│       └── Dashboard.test.tsx
├── services/
│   ├── gitScanner.ts
│   └── __tests__/
│       └── gitScanner.test.ts
└── utils/
    ├── colors.ts
    └── __tests__/
        └── colors.test.ts
```

Tests are co-located with the code they test in `__tests__/` directories.

## Testing Patterns

### Component Tests (TUI)

TUI components use `ink-testing-library` for testing. The key method is `lastFrame()`, which returns the terminal output as a string.

```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { MyComponent } from '../MyComponent.js';

describe('MyComponent', () => {
  it('should render expected text', () => {
    const { lastFrame } = render(<MyComponent />);

    // Assert on text content
    expect(lastFrame()).toContain('Expected Text');
  });
});
```

#### Important Notes

- **Text-based assertions only**: No DOM, no visual snapshots
- Use `lastFrame()` to get current terminal output as a string
- Test for presence/absence of text
- Use snapshots sparingly (update intentionally)

### Service Tests (Business Logic)

Service layer tests are standard unit tests. Mock external dependencies.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myService } from '../myService.js';

// Mock external dependencies
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('mock content'),
}));

describe('myService', () => {
  it('should process data correctly', async () => {
    const result = await myService();
    expect(result).toBe('expected value');
  });
});
```

## Mocking

### Mock External Dependencies

Always mock:
- Filesystem operations (`fs`, `fs/promises`)
- Git operations (`simple-git`)
- Configuration (`conf`)
- External processes (`child_process`)

```typescript
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    status: vi.fn().mockResolvedValue({ files: [] }),
    checkIsRepo: vi.fn().mockResolvedValue(true),
  })),
}));
```

### Don't Mock Internal Code

Only mock external dependencies, not your own modules (unless testing in isolation).

## Test Coverage Goals

- **Overall**: 70%+ coverage
- **Services**: 80%+ (core business logic)
- **Components**: 60%+ (focus on behavior, not rendering details)
- **Utils**: 90%+ (pure functions should be easy to test)

Check coverage:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Testing Checklist

For each component/service, ensure tests cover:

### Components
- [x] Renders without crashing
- [x] Displays expected text content
- [x] Handles props correctly
- [x] Shows/hides elements based on state
- [ ] Handles keyboard input (if applicable)
- [ ] Snapshot test for complex layouts (optional)

### Services
- [x] Handles success cases
- [x] Handles error cases
- [x] Validates input
- [x] Calls dependencies correctly
- [x] Returns expected output format

## Testing Keyboard Input

Testing keyboard input with ink-testing-library is limited. Focus on testing the handlers directly:

```typescript
// Instead of simulating keypresses, test the handler
describe('Dashboard navigation', () => {
  it('should navigate up when navigateUp is called', () => {
    // Test the navigation logic directly
    const state = { selectedIndex: 5 };
    const newIndex = Math.max(0, state.selectedIndex - 1);
    expect(newIndex).toBe(4);
  });
});
```

## Async Testing

Use `async/await` for asynchronous tests:

```typescript
it('should load repos', async () => {
  const repos = await scanForRepos(config);
  expect(repos).toHaveLength(10);
});
```

## Snapshot Testing

Use sparingly for complex layouts:

```typescript
it('should match snapshot', () => {
  const { lastFrame } = render(<ComplexComponent />);
  expect(lastFrame()).toMatchSnapshot();
});
```

Update snapshots with:
```bash
npm test -- -u
```

## Testing Utilities

### Fixtures

Create test fixtures for common data:

```typescript
// __tests__/fixtures.ts
export const mockRepo = {
  path: '/home/user/test-repo',
  name: 'test-repo',
  branch: 'main',
  status: 'clean',
  linesAdded: 0,
  linesDeleted: 0,
  uncommittedFiles: 0,
  unpushedCommits: 0,
  lastCommitDate: new Date('2024-01-01'),
  lastCommitMessage: 'Test commit',
  remotes: ['origin'],
  isFavorite: false,
};
```

### Helper Functions

Create test helpers for common operations:

```typescript
// __tests__/helpers.ts
export function renderWithRepos(repos: GitRepo[]) {
  return render(<RepoList repos={repos} />);
}
```

## Debugging Tests

### Failed Test

```bash
# Run single test file
npm test StatusBadge.test.tsx

# Run with verbose output
npm test -- --reporter=verbose

# Run specific test by name
npm test -- -t "should render status symbol"
```

### Print Debug Info

```typescript
it('should render correctly', () => {
  const { lastFrame } = render(<MyComponent />);

  // Print output for debugging
  console.log(lastFrame());

  expect(lastFrame()).toContain('text');
});
```

## CI/CD Integration

Tests run automatically in CI. Ensure all tests pass before merging:

```bash
# Full pre-commit check
npm run type-check && npm run lint && npm test
```

## Common Issues

### Test Timeout

Increase timeout for slow tests:

```typescript
it('should handle slow operation', async () => {
  // Test code
}, 10000); // 10 second timeout
```

### Flaky Tests

If tests fail intermittently:
1. Check for race conditions
2. Ensure mocks are reset between tests
3. Use `beforeEach` to reset state

### Import Errors

Ensure `.js` extensions in imports:

```typescript
// Correct
import { MyComponent } from '../MyComponent.js';

// Wrong
import { MyComponent } from '../MyComponent';
```

## Writing Good Tests

### Do
- Test behavior, not implementation
- Use descriptive test names
- Keep tests simple and focused
- Mock external dependencies
- Test edge cases and error conditions

### Don't
- Test implementation details
- Test third-party library functionality
- Write tests that depend on execution order
- Commit failing tests
- Skip tests without good reason

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
