# Delta-Scope Architecture

## Overview

Delta-Scope is a TUI (Terminal User Interface) application for monitoring git repository status across multiple directories. Built with Ink (React for CLI), it provides a dashboard view of repository health.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI | Ink (React) | Terminal UI components |
| State | React hooks | Component state management |
| Data | better-sqlite3 | Local persistence (frecency, history) |
| Git | Node.js child_process | Git command execution |
| Build | TypeScript + tsc | Type safety, ESM modules |
| Test | Vitest | Unit and integration testing |

## Directory Structure

```
src/
├── cli.tsx              # Entry point, CLI argument handling
├── index.ts             # Public exports
├── components/          # Ink React components
│   ├── Dashboard.tsx    # Main view orchestrator
│   ├── Header.tsx       # App title and status
│   ├── Footer.tsx       # Keyboard shortcuts
│   ├── RepoList.tsx     # Repository listing
│   ├── RepoDetail.tsx   # Single repo details
│   └── ...
├── services/            # Business logic (stateless functions + singletons)
│   ├── gitScanner.ts    # Find .git directories
│   ├── gitStatus.ts     # Get repo status via git commands
│   ├── database/        # SQLite persistence (refactored to modules)
│   ├── configManager.ts # User configuration
│   └── ...
├── hooks/               # React hooks for shared state
└── types/               # TypeScript type definitions
```

## Key Design Decisions

### 1. Service Singleton Pattern
Services use lazy-initialized singletons via `getXxxService()` factories:
```typescript
let instance: DatabaseService | null = null;
export function getDatabaseService(): DatabaseService {
  if (!instance) instance = new DatabaseService();
  return instance;
}
```

### 2. ESM Modules with .js Extensions
All imports use `.js` extensions for ESM compatibility:
```typescript
import { scanForRepos } from './gitScanner.js';
```

### 3. Component Composition
Dashboard.tsx orchestrates views, delegating to specialized components:
- `view === 'home'` → RepoList
- `view === 'detail'` → RepoDetail
- `view === 'settings'` → SettingsView

### 4. Graceful Error Handling
Services catch and handle errors internally, returning safe defaults:
```typescript
try {
  return await execGit(path, 'status');
} catch {
  return { status: 'unknown', error: true };
}
```

## Data Flow

```
User Input → Dashboard (useInput) → State Update → Re-render
                ↓
         Service Call (async)
                ↓
         State Update → Re-render
```

## File Size Limits

**Maximum: 600 lines per file**

When files approach this limit:
1. Extract logical units to separate modules
2. Use index.ts to re-export (maintain API)
3. Database.ts was refactored: 1500 → 362 lines (extracted to `database/` folder)
