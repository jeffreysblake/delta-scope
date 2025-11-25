# Proactive Context Loading

## Purpose

Automatically load relevant context before starting work. Context files should be read proactively, not reactively.

## When This Skill Activates

At the start of ANY significant task, BEFORE writing code.

## Context Loading Rules

Based on task type, automatically read these files:

| Task Type | Files to Read | Why |
|-----------|---------------|-----|
| Bug fix | `gotchas.md`, `CORRECTIONS.md` | Known issues, past solutions |
| New service | `patterns.md`, `architecture.md` | Established patterns, design |
| New component | `patterns.md` | Component conventions |
| Refactoring | `architecture.md`, `patterns.md` | Structure, patterns to preserve |
| Test writing | `patterns.md`, `gotchas.md` | Test patterns, mock gotchas |
| Performance work | `gotchas.md`, `architecture.md` | Known bottlenecks, data flow |
| API changes | `architecture.md`, `patterns.md` | Integration points, conventions |

## Detection Patterns

Automatically detect task type from user request:

### Bug Fix Detection
Keywords: "fix", "bug", "error", "broken", "failing", "crash", "issue", "wrong"
→ Read: `.claude/context/gotchas.md`, `.claude/memories/CORRECTIONS.md`

### New Feature Detection
Keywords: "create", "new", "add", "implement", "build"
- + "service" → Read: `.claude/context/patterns.md` (service section)
- + "component" → Read: `.claude/context/patterns.md` (component section)
- + "hook" → Read: `.claude/context/patterns.md` (hook section)
- + "test" → Read: `.claude/context/patterns.md` (test section)

### Refactoring Detection
Keywords: "refactor", "reorganize", "split", "extract", "consolidate", "clean up"
→ Read: `.claude/context/architecture.md`, `.claude/context/patterns.md`

### File Path Detection
- Task involves `src/services/` → Read service patterns
- Task involves `src/components/` → Read component patterns
- Task involves `__tests__/` or `.test.` → Read test patterns + gotchas
- Task involves `types/` → Read type organization patterns

## Self-Check Before Any Work

Before writing ANY code, ask yourself:

1. **Have I read the relevant context file?**
   - If NO → STOP and read it first

2. **Do I know the established patterns for this type of work?**
   - If NO → Read patterns.md for this domain

3. **Am I aware of known gotchas in this area?**
   - If NO → Check gotchas.md

4. **Has a similar issue been fixed before?**
   - If UNSURE → Check CORRECTIONS.md

## Context Loading Checklist

```
□ Identified task type (bug fix / new feature / refactor / etc.)
□ Read relevant context files per table above
□ Checked CORRECTIONS.md for similar past issues
□ Noted any relevant gotchas
□ Understood established patterns for this domain
□ Ready to proceed with full context
```

## Anti-Patterns

**WRONG:**
- Starting to code immediately without reading context
- Assuming you know the patterns from general knowledge
- Skipping gotchas.md because "it's probably fine"
- Not checking CORRECTIONS.md for recurring issues

**RIGHT:**
- Always read context before coding
- Verify patterns match project conventions
- Check gotchas even for "simple" tasks
- Learn from documented past mistakes

## Integration with Other Skills

When this skill activates, consider also:
- `debug-like-expert` → If fixing a bug, use systematic debugging
- `test-integrity` → If writing tests, follow TDD principles
- `proper-solutions` → Ensure solution matches established patterns
