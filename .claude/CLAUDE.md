# Claude Code Project Configuration

## Core Development Principles

### Code Quality Standards

**File Organization**
- Files MUST NOT exceed 600 lines
- When a file approaches 600 lines, refactor into smaller, focused modules
- Each file should have a single, clear responsibility
- Extract reusable logic into utility functions/modules

**Testing Requirements**
- ALL new code MUST have corresponding tests
- ALL edited code MUST have tests updated or added
- Prefer inline tests (within the same file or adjacent) over creating new test files
- Test files should be co-located with implementation files
- Minimum test coverage: 80% for new/modified code
- Run tests after ANY code change before considering work complete

**Code Consolidation Over Creation**
- ALWAYS search for existing similar functionality before writing new code
- Consolidate duplicate code patterns into reusable utilities
- Prefer extending existing functions over creating new ones
- Use the `/consolidate` command to find and merge duplicate code
- Document WHY code exists, not just WHAT it does

**Documentation Standards**
- Update existing documentation rather than creating new files
- Keep documentation close to the code (inline comments, JSDoc, docstrings)
- Documentation should explain intent and architecture, not obvious syntax
- README files should be concise: setup, usage, architecture overview only
- Avoid excessive markdown files - consolidate related docs

**Linting and Formatting**
- Code MUST pass all linters before completion
- Fix linting errors immediately when they appear
- Maintain consistent code style throughout the project
- Use project-configured formatters (prettier, eslint, etc.)
- Never commit code with linting errors

### Self-Improving Workflow

**Before Starting ANY Task**
1. Read relevant existing code and tests
2. Check for similar patterns already in the codebase
3. Create a plan using the TodoWrite tool for complex tasks
4. Verify understanding with the user if requirements are ambiguous

**During Implementation**
1. Write/update tests FIRST (TDD approach)
2. Implement the minimal code to pass tests
3. Run linters and formatters
4. Check test coverage
5. Refactor for clarity and consolidation
6. Update related documentation

**After Implementation**
1. Run full test suite
2. Verify linting passes
3. Check that no files exceed 600 lines
4. Review for code duplication opportunities
5. Update the todo list to mark completion
6. Commit with clear, descriptive messages

### Problem-Solving Approach

**When Encountering Errors**
- Read error messages completely and carefully
- Search the codebase for similar error handling patterns
- Fix the root cause, not just symptoms
- Add tests to prevent regression
- Document non-obvious fixes

**When Unsure**
- Use `/research` to explore the codebase
- Check existing patterns and conventions
- Ask clarifying questions rather than assuming
- Prototype small solutions before large refactors

### Common Patterns to Avoid

**Anti-Patterns**
- Creating new files when existing ones can be extended
- Writing new utilities without checking for existing ones
- Skipping tests "to save time"
- Committing untested code
- Creating documentation files instead of improving existing ones
- Ignoring linting errors "to fix later"
- Copy-pasting code instead of creating shared utilities

**Good Patterns**
- Small, focused functions with single responsibilities
- Comprehensive error handling with context
- Descriptive variable and function names
- Consistent code style matching project conventions
- Tests that document expected behavior
- Comments explaining complex logic or business rules

## Tool Usage Guidelines

### Preferred Tools
- Use `/review` before considering work complete
- Use `/test` to generate comprehensive tests
- Use `/consolidate` to find code duplication
- Use `/check-coverage` to verify test coverage
- Use `/optimize` for performance review
- Use specialized sub-agents for complex tasks

### Quality Checks
- ALWAYS run the test suite before marking work complete
- ALWAYS run linters before marking work complete
- NEVER skip quality checks to move faster
- Use hooks for automated enforcement

## Learning and Adaptation

### Pattern Recognition
- Note recurring code patterns and consider extracting them
- Identify frequently fixed bugs and add preventive measures
- Track common questions and improve documentation
- Monitor test failures to improve test quality

### Continuous Improvement
- Regularly review and update this CLAUDE.md file
- Add new patterns and anti-patterns as discovered
- Update tool recommendations based on effectiveness
- Refine quality standards based on project needs

### Memory System
- Use `.claude/memories/CORRECTIONS.md` for corrections and common issues
- Use `/learn` command to record new learnings after fixing issues
- Review CORRECTIONS.md when encountering familiar error patterns
- Document architecture decisions in ADR format
- Keep a changelog of significant refactorings
- Track technical debt and improvement opportunities

**Before fixing any issue**: Check if similar pattern exists in CORRECTIONS.md
**After fixing any issue**: Use `/learn` to record the correction for future reference

## Project-Specific Context

### Technology Stack
- Primary language(s): TypeScript (ESM modules with .js extensions)
- Framework(s): Ink (React-based TUI), better-sqlite3
- Testing framework(s): Vitest
- Build tools: tsc (TypeScript compiler)
- Linting/formatting: ESLint, Prettier

### Key Commands
- Install dependencies: `npm install`
- Run tests: `npm test`
- Run linters: `npm run lint`
- Build project: `npm run build`
- Run development server: `npm run dev`
- Check coverage: `npm run test:coverage`

### Architecture Overview
- Project structure: CLI TUI app with services layer
- Key directories:
  - `src/components/` - Ink React components (Dashboard, Header, Footer, etc.)
  - `src/services/` - Business logic (gitScanner, database, scheduler, etc.)
  - `src/hooks/` - React hooks for shared state
  - `src/types/` - TypeScript type definitions
- Configuration files: `tsconfig.json`, `vitest.config.ts`, `.eslintrc.json`
- Entry points: `src/cli.tsx` (main), `src/index.ts` (exports)

### Coding Conventions
- Naming conventions: camelCase for variables/functions, PascalCase for types/components
- Import/export patterns: Named exports preferred, use `.js` extensions for ESM
- Error handling approach: Try-catch with logging, graceful degradation
- State management: React hooks (useState, useEffect), service singletons
- API patterns: Services use singleton pattern with `getXxxService()` factories

## Custom Instructions

### Slash Commands
When appropriate, Claude should proactively suggest using:
- `/review` - Comprehensive code review before completion
- `/test` - Generate tests for new/modified code
- `/consolidate` - Find and merge duplicate code
- `/check-coverage` - Verify test coverage metrics
- `/optimize` - Performance and efficiency review
- `/research` - Explore codebase for patterns
- `/debug [issue]` - Systematic debugging with hypothesis testing
- `/learn [category] [description]` - Record corrections and learnings
- `/heal-skill` - Fix skill documentation after discovering issues
- `/whats-next` - Generate handoff document for context continuation
- `/meta-review` - Validate changes before committing (quality gate)
- `/add-to-todos` - Capture todo with context for later
- `/check-todos` - List and work on outstanding todos

### Skills
Available skills for specialized tasks:
- `debug-like-expert` - Deep analysis debugging with scientific method
- `test-integrity` - Prevent modifying tests to match incorrect behavior
- `persistence` - Prevent giving up too early on complex tasks
- `build-verification` - Ensure code is built before testing
- `proper-solutions` - Enforce production-quality solutions
- `proactive-context` - Auto-load relevant context before work
- `skill-composition` - Skills that cascade and reinforce each other

**Skill Auto-Triggering**: Skills now activate automatically via hooks:
- Edit test file → `test-integrity` activates
- Run test command → `build-verification` activates
- Multiple failures → `persistence` activates

### Sub-Agents
For specialized tasks, invoke:
- `code-reviewer` - Deep code quality analysis
- `test-generator` - Comprehensive test creation
- `refactor-specialist` - Safe refactoring operations
- `meta-reviewer` - Pre-commit validation (automatic via hook)

## Context and Knowledge Base

### Context Folder
Located at `.claude/context/`, contains project-specific knowledge:
- `architecture.md` - Project structure, design decisions, key abstractions
- `patterns.md` - Common code patterns (services, components, hooks)
- `gotchas.md` - Known issues, workarounds, and edge cases

**Before starting work**, read relevant context files:
- Architecture changes → `architecture.md`
- New services/components → `patterns.md`
- Bug fixes → `gotchas.md`

### Session Logging
Located at `.claude/logs/`:
- `SESSION-LOG.md` - Rolling log of recent sessions (last 7 days)
- `archive/` - Weekly archives

Session logs track: work completed, files modified, issues encountered, next steps.
Use for continuity across sessions and `/whats-next` command.

### Automated Hooks
Active hooks (registered in `.claude/settings.local.json`):

**Session Lifecycle:**
- **session-start.sh** - Initializes context, suggests relevant files to read
- **context-preservation.sh** - Auto-saves session summary on exit

**Pre-Tool Validation:**
- **pre-bash-safety.sh** - Blocks dangerous commands, warns on risky operations

**Post-Tool Analysis:**
- **post-edit-quality.sh** - Checks file size, debug statements, linting
- **post-bash-error.sh** - Provides debug guidance when build/test fails
- **skill-auto-trigger.sh** - Auto-activates relevant skills based on context
- **corrections-lookup.sh** - Searches CORRECTIONS.md for similar past issues
- **auto-gotcha.sh** - Tracks recurring errors, suggests adding to gotchas.md

**Self-Improving Feedback Loops:**
1. Error occurs → corrections-lookup finds past solutions
2. Same error 3+ times → auto-gotcha suggests documenting it
3. Build/test fails → skills auto-trigger (debug, persistence)
4. Session ends → context auto-saved for continuity

## Session Initialization

At the start of each session:
1. Load recent git commits to understand recent changes
2. Read `.claude/logs/SESSION-LOG.md` for recent context
3. Check for any failing tests or linting errors
4. Review open TODOs (`TO-DOS.md`) and technical debt
5. Verify development environment is properly configured
6. Load relevant context files from `.claude/context/`
