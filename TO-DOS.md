# Outstanding TODOs

## Fix Dashboard Test Mocks - 2025-11-25 02:00

- **Add cleanupOldHistory to database mock** - Dashboard.test.tsx calls getDatabaseService().cleanupOldHistory() but mock doesn't include it. **Problem:** Error "cleanupOldHistory is not a function" causes all 30 Dashboard tests to fail with component error boundary. **Files:** `src/components/__tests__/Dashboard.test.tsx:18-30`, `src/components/__tests__/Dashboard.additional.test.tsx:18-30`. **Solution:** Add `cleanupOldHistory: vi.fn()` to the getDatabaseService mock in both test files.

- **Fix integration test scanForRepos mock** - Integration tests expect scanForRepos to return paths but mock returns empty. **Problem:** Tests expect 2 repos but get 0 - "expected [] to have a length of 2". **Files:** `src/__tests__/integration.test.ts`. **Solution:** Verify mock setup returns proper paths, check if mock is being applied before import.

## Open Source Preparation - 2025-11-25 02:00

- **Decide on .claude folder inclusion** - The .claude/ folder contains Claude Code development artifacts. **Problem:** Need decision on whether to include in public repo or add to .gitignore. **Files:** `.gitignore`, `.claude/`. **Solution:** Either add `.claude/` to .gitignore (private tooling) OR keep it (helpful for contributors using Claude Code).

- **Add CONTRIBUTING.md** - Standard open-source file missing. **Problem:** No contribution guidelines for potential contributors. **Files:** `CONTRIBUTING.md` (new). **Solution:** Create basic contributing guide with setup instructions, code style, PR process.

- **Add CODE_OF_CONDUCT.md** - Standard open-source file missing. **Problem:** No code of conduct for community. **Files:** `CODE_OF_CONDUCT.md` (new). **Solution:** Add Contributor Covenant or similar.

## Test Coverage Improvements - 2025-11-25 02:00

- **Increase service test coverage** - Several services have minimal or no tests. **Problem:** Low test coverage on critical services. **Files:** `src/services/aiAgent.ts`, `src/services/scheduler.ts`, `src/services/actionExecutor.ts`. **Solution:** Add unit tests for untested service methods.
