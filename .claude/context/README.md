# Context Folder

This folder contains project-specific knowledge and patterns for Claude Code to reference.

## Contents

- **architecture.md** - Project structure, design decisions, key abstractions
- **patterns.md** - Common code patterns to follow (services, components, hooks)
- **gotchas.md** - Known issues, workarounds, and edge cases

## Usage

Claude should read relevant context files before starting work:

| Task Type | Read First |
|-----------|------------|
| Architecture changes | `architecture.md` |
| New services/components | `patterns.md` |
| Bug fixes | `gotchas.md` |
| Refactoring | `architecture.md` + `patterns.md` |

## Maintenance

Update these files when:
- New architectural patterns are established
- Common gotchas are discovered
- Patterns change or evolve
