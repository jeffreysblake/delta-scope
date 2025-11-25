# Skill Composition

## Purpose

Define how skills interact and trigger each other. Skills are more powerful when they reinforce each other.

## Skill Dependency Graph

When one skill activates, related skills should also be considered:

```
proactive-context (START HERE)
│
├─► debug-like-expert (if bug fix)
│   ├─► build-verification (before running tests)
│   ├─► test-integrity (when modifying tests during debug)
│   └─► persistence (when debugging is difficult)
│
├─► test-integrity (if writing/modifying tests)
│   ├─► build-verification (before running tests)
│   └─► proper-solutions (no partial coverage)
│
├─► proper-solutions (always)
│   └─► persistence (when tempted to shortcut)
│
└─► build-verification (before any execution)
    └─► test-integrity (tests must pass)
```

## Cascade Rules

### When `debug-like-expert` Activates
Also activate:
1. `build-verification` - Ensure code is built before testing hypotheses
2. `test-integrity` - If you modify tests during debugging, don't weaken them
3. `persistence` - Complex bugs require systematic investigation

### When `test-integrity` Activates
Also activate:
1. `build-verification` - Tests run against built code
2. `proper-solutions` - Tests should be comprehensive, not minimal

### When `proper-solutions` Activates
Also activate:
1. `persistence` - Proper solutions take effort
2. `proactive-context` - Check patterns before implementing

### When `build-verification` Activates
Also activate:
1. `test-integrity` - After build, tests should pass

### When `persistence` Activates
Also activate:
1. `proper-solutions` - Don't persist toward a hack
2. `debug-like-expert` - Use systematic approach

## Anti-Pattern Prevention Chains

When user shows signs of problematic behavior, trigger skill chains:

### Sign: Giving Up
Indicators: "let me try something simpler", "this is too complex", "maybe we should..."
Trigger chain:
1. `persistence` → Don't give up, break down the problem
2. `proper-solutions` → The "simpler" approach is often a hack
3. `debug-like-expert` → Use systematic investigation

### Sign: Weakening Tests
Indicators: "let me update the test", "the assertion is too strict", "change expected to..."
Trigger chain:
1. `test-integrity` → Tests define correctness, don't weaken them
2. `persistence` → Fix the code, not the test
3. `proper-solutions` → Proper fix, not test modification

### Sign: Skipping Build
Indicators: "let me just run the tests", "it should work", "skip the build for now"
Trigger chain:
1. `build-verification` → Always build before test
2. `test-integrity` → Tests need built code
3. `proper-solutions` → No shortcuts

### Sign: Quick Fixes
Indicators: "quick fix", "for now", "temporary", "workaround", "we can improve later"
Trigger chain:
1. `proper-solutions` → No temporary fixes
2. `persistence` → Take time to do it right
3. `proactive-context` → Check established patterns

## Skill Activation Examples

### Example 1: User says "Fix the failing test"
```
1. proactive-context activates
   → Read gotchas.md, CORRECTIONS.md

2. debug-like-expert activates (it's a bug fix)
   → Form hypothesis about WHY test fails

3. test-integrity activates (involves tests)
   → Remember: fix code, not test

4. build-verification activates (before running)
   → Ensure code is built
```

### Example 2: User says "Add a new service for X"
```
1. proactive-context activates
   → Read patterns.md (service section), architecture.md

2. proper-solutions activates (new code)
   → Follow established service pattern exactly

3. test-integrity activates (new code needs tests)
   → Write tests first (TDD)

4. build-verification activates (before testing)
   → Build after creating files
```

### Example 3: Multiple test failures, user getting frustrated
```
1. persistence activates (difficulty detected)
   → Don't give up, systematic approach

2. debug-like-expert activates
   → One hypothesis at a time

3. test-integrity activates (involves tests)
   → Don't weaken tests out of frustration

4. proper-solutions activates
   → Fix root cause, not symptoms
```

## Composition Checklist

Before responding to any task:

```
□ Which primary skill applies to this task?
□ What secondary skills should cascade?
□ Am I showing any anti-pattern signs?
□ Have I loaded the relevant context?
□ Am I following all activated skill principles?
```

## Integration Points

Skills should be checked at these moments:
1. **Task Start** - proactive-context always
2. **Before Bash** - build-verification for test/run commands
3. **On Edit** - test-integrity for test files
4. **On Failure** - persistence, debug-like-expert
5. **Before Commit** - proper-solutions, test-integrity
