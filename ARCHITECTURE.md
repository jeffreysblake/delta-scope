# Delta-Scope Architecture

Technical architecture and design decisions for delta-scope.

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [AI Agent System](#ai-agent-system)
7. [Database Schema](#database-schema)
8. [State Management](#state-management)
9. [Testing Strategy](#testing-strategy)
10. [Performance Considerations](#performance-considerations)
11. [Security](#security)
12. [Future Architecture](#future-architecture)

## System Overview

Delta-scope is a terminal-based UI (TUI) application built with React (via Ink) for managing multiple git repositories with AI-powered recommendations.

```
┌─────────────┐
│   User      │
│  Terminal   │
└──────┬──────┘
       │
       ├─ Keyboard Input
       │
┌──────▼──────────────────────────────────────┐
│  Ink Runtime (React for CLI)                │
│  ┌────────────────────────────────────────┐ │
│  │  Dashboard (Main Router)               │ │
│  │  ┌──────────┬──────────┬────────────┐  │ │
│  │  │ RepoList │ AgentView│SettingsView│ │ │
│  │  └──────────┴──────────┴────────────┘  │ │
│  └────────────────────────────────────────┘ │
└──────┬────────────┬─────────────┬───────────┘
       │            │             │
┌──────▼─────┐ ┌───▼────────┐ ┌──▼──────────┐
│   Git      │ │    AI      │ │   Database  │
│  Services  │ │   Agent    │ │   Service   │
└────────────┘ └────────────┘ └─────────────┘
       │            │             │
       ▼            ▼             ▼
┌────────────┐ ┌──────────┐ ┌────────────────┐
│ Local Git  │ │ AI APIs  │ │ SQLite DB      │
│ Repos      │ │ (LLMs)   │ │ (Persistence)  │
└────────────┘ └──────────┘ └────────────────┘
```

### Key Design Principles

1. **Local-First**: All data stored locally, no cloud dependencies (except AI)
2. **Fast & Responsive**: Async operations, progressive loading
3. **Type-Safe**: TypeScript strict mode throughout
4. **Testable**: High test coverage (281 tests), mocked dependencies
5. **Extensible**: Plugin architecture for AI providers

## Technology Stack

### Core Technologies

**UI Layer:**
- **Ink 4.x**: React reconciler for CLI apps
  - Provides React components for terminal UIs
  - Handles rendering, input, and layout
  - Used: Box, Text, useInput, useApp hooks

**Runtime:**
- **Node.js 18+**: JavaScript runtime
- **TypeScript 5.x**: Type-safe development

**State Management:**
- **React Hooks**: useState, useEffect, useCallback, useMemo
- **Context**: Minimal use, mainly prop drilling
- **No external state library**: Keeps bundle small

### Services Layer

**Git Integration:**
- **simple-git**: Promise-based git operations
  - Used for: status, log, branch, remote queries
  - Async by default
  - Wraps native git CLI

**Database:**
- **better-sqlite3**: Synchronous SQLite binding
  - In-memory or file-based
  - Prepared statements for performance
  - Automatic schema migrations

**AI Integration:**
- **@anthropic-ai/sdk**: Anthropic Claude API
- **openai**: OpenAI GPT API
- Both support local OpenAI-compatible servers (ollama, lm-studio)

### Development Tools

**Build:**
- **tsup**: Fast TypeScript bundler
- **esbuild**: Under the hood

**Testing:**
- **Vitest**: Fast test runner
- **ink-testing-library**: Test Ink components
- **@testing-library/react**: Test utilities

**Quality:**
- **ESLint**: Linting with TypeScript rules
- **Prettier**: Code formatting (via ESLint)
- **TypeScript**: Type checking

## Directory Structure

```
delta-scope/
├── src/
│   ├── cli.tsx                      # Entry point, CLI setup
│   ├── app.tsx                      # App root with ErrorBoundary
│   │
│   ├── components/                  # React/Ink UI components
│   │   ├── Dashboard.tsx            # Main view router & state
│   │   ├── Header.tsx               # Status bar with stats
│   │   ├── Footer.tsx               # Keyboard shortcuts
│   │   ├── RepoList.tsx             # Grouped repository list
│   │   ├── RepoItem.tsx             # Individual repo rendering
│   │   ├── StatusBadge.tsx          # Status indicator
│   │   ├── DetailView.tsx           # Full repository details
│   │   ├── SettingsView.tsx         # Configuration UI
│   │   ├── AgentView.tsx            # AI recommendations
│   │   ├── FilterInput.tsx          # Fuzzy search
│   │   ├── ConfirmationDialog.tsx   # Action confirmation
│   │   ├── ErrorBoundary.tsx        # Error handling
│   │   ├── HelpView.tsx             # Help screen
│   │   └── DebugPanel.tsx           # Dev mode debug info
│   │
│   ├── services/                    # Business logic (pure TS)
│   │   ├── gitScanner.ts            # Find git repositories
│   │   ├── gitStatus.ts             # Get repository status
│   │   ├── gitOperations.ts         # Git actions (commit/push/stash)
│   │   ├── configManager.ts         # Configuration management
│   │   ├── database.ts              # SQLite persistence
│   │   ├── aiAgent.ts               # AI service orchestration
│   │   ├── agentContext.ts          # Build AI context
│   │   └── prompts.ts               # AI prompt templates
│   │
│   ├── types/                       # TypeScript type definitions
│   │   ├── index.ts                 # Core types (GitRepo, Config)
│   │   └── agent.ts                 # AI types (AgentContext, etc.)
│   │
│   └── utils/                       # Utility functions
│       ├── colors.ts                # Color scheme & constants
│       └── keybindings.ts           # Keyboard shortcut mappings
│
├── dist/                            # Build output
├── node_modules/                    # Dependencies
│
├── package.json                     # Project manifest
├── tsconfig.json                    # TypeScript config
├── vitest.config.ts                 # Test config
├── eslint.config.js                 # Linting config
│
├── README.md                        # User-facing documentation
├── USER_GUIDE.md                    # Detailed usage guide
├── ARCHITECTURE.md                  # This file
├── TESTING.md                       # Testing documentation
├── ROADMAP.md                       # Future plans
└── AGENTIC_ROADMAP.md              # AI features roadmap
```

### File Responsibilities

**Entry Points:**
- `cli.tsx` - Parse CLI args, initialize app
- `app.tsx` - Wrap Dashboard in ErrorBoundary

**Components:**
- Follow single responsibility principle
- Pure components when possible
- Use hooks for state and side effects

**Services:**
- Pure TypeScript (no React/Ink dependencies)
- Async/await for I/O operations
- Export functions, not classes (except DatabaseService)

**Types:**
- Centralized in `types/`
- Shared between services and components
- Export from index files for easy imports

## Core Components

### Dashboard (Main Controller)

The Dashboard is the brain of the application at `src/components/Dashboard.tsx:45`

**Responsibilities:**
- Route between views (home, detail, settings, agent, help)
- Manage global state (repos, selected repo, filter, sort)
- Handle keyboard input routing
- Coordinate data fetching
- Manage AI interactions

**State:**
```typescript
const [repos, setRepos] = useState<GitRepo[]>([]);
const [view, setView] = useState<ViewType>('home');
const [selectedRepo, setSelectedRepo] = useState<GitRepo | null>(null);
const [filterQuery, setFilterQuery] = useState('');
const [sortMode, setSortMode] = useState<SortMode>('status');
const [notification, setNotification] = useState<Notification | null>(null);
const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
```

**Key Functions:**
```typescript
// Repository management
loadRepos()           // Fetch all repos from disk
filterRepos()         // Apply fuzzy filter
groupRepos()          // Group by status
sortRepos()           // Apply sort mode

// AI operations
triggerAIAnalysis()   // Start AI analysis
executeAction()       // Execute AI recommendation

// View management
setView()             // Change current view
showNotification()    // Display toast message
```

**Performance Optimizations:**
- `useMemo` for expensive filters/groups (`src/components/Dashboard.tsx:210`)
- `useCallback` for stable function references
- Debounced filter input
- Lazy loading of repo details

### Repository Scanner

Finds git repositories on the filesystem at `src/services/gitScanner.ts:30`

**Algorithm:**
```typescript
async function scanForRepos(config: AppConfig): Promise<string[]> {
  const repos: string[] = [];

  for (const basePath of config.basePaths) {
    await scanDirectory(basePath, 0);
  }

  return repos;

  async function scanDirectory(dir: string, depth: number) {
    if (depth > config.maxDepth) return;
    if (isExcluded(dir, config.excludePatterns)) return;

    const entries = await readdir(dir);

    // Check if this directory is a git repo
    if (entries.includes('.git')) {
      repos.push(dir);
      return; // Don't scan inside git repos
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await scanDirectory(entry.path, depth + 1);
      }
    }
  }
}
```

**Optimizations:**
- Early exit when `.git` found
- Parallel directory traversal
- Exclude patterns checked before descending

### Git Status Service

Gets status for repositories at `src/services/gitStatus.ts:18`

**Workflow:**
```typescript
async function getRepoStatus(repoPath: string): Promise<GitRepo> {
  const git = simpleGit(repoPath);

  // Run multiple git commands in parallel
  const [status, log, branch, remotes] = await Promise.all([
    git.status(),
    git.log({ maxCount: 1 }),
    git.branch(),
    git.remote([]),
  ]);

  // Combine results
  return {
    name: path.basename(repoPath),
    path: repoPath,
    status: deriveStatus(status),
    branch: branch.current,
    changes: countChanges(status),
    ahead: status.ahead,
    behind: status.behind,
    remotes,
    lastCommitDate: log.latest?.date,
    lastCommitMessage: log.latest?.message,
    isFavorite: configManager.get().favorites.includes(repoPath),
  };
}
```

**Multi-Repo Optimization:**
```typescript
async function getMultipleRepoStatus(
  repoPaths: string[]
): Promise<GitRepo[]> {
  // Parallel fetching with concurrency limit
  const results = await Promise.all(
    repoPaths.map(path => getRepoStatus(path))
  );

  return results.filter(repo => repo !== null);
}
```

### AI Agent

Orchestrates AI analysis and recommendations at `src/services/aiAgent.ts:23`

**Provider Abstraction:**
```typescript
interface AIProvider {
  name: 'anthropic' | 'openai' | 'local';
  callAI(prompt: string): Promise<string>;
}

class AIAgent {
  private provider: AIProvider;

  constructor(config: AIConfig) {
    this.provider = this.createProvider(config);
  }

  async analyze(context: AgentContext): Promise<AgentResponse> {
    const prompt = this.buildPrompt(context);
    const response = await this.provider.callAI(prompt);
    return this.parseResponse(response);
  }
}
```

## Data Flow

### Repository Loading Flow

```
User starts app
      │
      ├─► Dashboard.useEffect() [on mount]
      │
      ├─► loadRepos()
      │     │
      │     ├─► configManager.get() → Get base paths
      │     │
      │     ├─► scanForRepos(config) → Find git repos
      │     │      │
      │     │      └─► Recursive file system scan
      │     │
      │     ├─► getMultipleRepoStatus(paths) → Get status
      │     │      │
      │     │      └─► Promise.all() → Parallel git status
      │     │
      │     └─► setRepos(results)
      │
      └─► Render RepoList
```

### AI Analysis Flow

```
User presses 'i'
      │
      ├─► Dashboard.handleInput('i')
      │
      ├─► setView('agent')
      │
      ├─► AgentView renders
      │
      ├─► useEffect() → triggerAnalysis()
      │
      ├─► agentContext.buildContext(repos)
      │      │
      │      ├─► Get repo stats from database
      │      ├─► Get search history
      │      ├─► Calculate frecency scores
      │      └─► Build enriched context
      │
      ├─► aiAgent.analyze(context)
      │      │
      │      ├─► Build prompt from template
      │      ├─► Call AI provider API
      │      ├─► Parse JSON response
      │      └─► Validate schema
      │
      ├─► filterDismissedRecommendations()
      │
      ├─► setAgentResponse(response)
      │
      └─► AgentView shows recommendations
```

## AI Agent System

### Context Builder

The AI needs rich context to provide good recommendations at `src/services/agentContext.ts:27`

**Context Structure:**
```typescript
interface AgentContext {
  // Current state
  scan_data: {
    repos: EnrichedRepo[];           // All repos with metadata
    total_repos: number;
    summary: StatusSummary;          // Counts by status
  };

  // User behavior
  user_patterns: {
    recent_repos: RecentRepo[];      // Last accessed
    frequent_repos: string[];        // Most accessed
    recent_searches: string[];       // Search history
    frequent_actions: ActionStat[];  // What user does
  };

  // Environment
  environment: {
    session_start: Date;
    working_directory: string;
    shell: string | null;
    terminal: string | null;
  };

  // Metadata
  timestamp: string;
  session_id: string;
}
```

**Health Score Algorithm** at `src/services/agentContext.ts:55`:
```typescript
function calculateHealthScore(repo: GitRepo): number {
  let score = 100;

  // Penalize uncommitted changes
  if (repo.status === 'uncommitted' || repo.status === 'both') {
    score -= 20;
  }

  // Penalize unpushed commits
  if (repo.ahead > 0) {
    score -= Math.min(repo.ahead * 5, 30);
  }

  // Penalize stale repos
  if (daysSinceCommit > 180) score -= 30;
  else if (daysSinceCommit > 90) score -= 20;
  else if (daysSinceCommit > 30) score -= 10;

  // Penalize no remotes
  if (repo.remotes.length === 0) {
    score -= 10;
  }

  return Math.max(0, score);
}
```

### Safety System

**Command Classification** at `src/services/aiAgent.ts:39`:
```typescript
const SAFE_COMMANDS = new Set([
  'view', 'navigate', 'filter', 'sort',
  'refresh', 'analyze', 'help'
]);

const DANGEROUS_COMMANDS = new Set([
  'commit', 'push', 'stash', 'delete',
  'merge', 'rebase', 'reset', 'clean'
]);

function validateAction(action: RecommendedAction): ValidationResult {
  const isSafe = SAFE_COMMANDS.has(action.command);
  const isDangerous = DANGEROUS_COMMANDS.has(action.command);

  if (isDangerous) {
    return {
      valid: true,
      requiresConfirmation: true,
      warnings: ['This action will modify your repository'],
      rollbackPossible: action.command === 'stash',
    };
  }

  return {
    valid: true,
    requiresConfirmation: false,
  };
}
```

## Database Schema

Delta-scope uses SQLite for local persistence at `src/services/database.ts:71`

**Schema Version: 3**

### Tables

**access_history:**
```sql
CREATE TABLE access_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path TEXT NOT NULL,
  accessed_at INTEGER NOT NULL,
  action TEXT NOT NULL,           -- 'view', 'expand', 'favorite', etc.
  session_id TEXT NOT NULL
);

CREATE INDEX idx_access_repo ON access_history(repo_path);
CREATE INDEX idx_access_time ON access_history(accessed_at);
```

**search_history:**
```sql
CREATE TABLE search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  result_count INTEGER NOT NULL,
  selected_repo_path TEXT
);

CREATE INDEX idx_search_query ON search_history(query);
CREATE INDEX idx_search_time ON search_history(timestamp);
```

**dismissed_recommendations:**
```sql
CREATE TABLE dismissed_recommendations (
  id TEXT PRIMARY KEY,             -- Recommendation ID
  dismissed_at INTEGER NOT NULL,
  reason TEXT
);
```

### Frecency Calculation

**Algorithm** at `src/services/database.ts:205`:
```typescript
calculateFrecency() {
  const now = Date.now();
  const scores = new Map<string, number>();

  // Get all access history
  const history = this.db.prepare(`
    SELECT repo_path, accessed_at, action
    FROM access_history
    ORDER BY repo_path, accessed_at DESC
  `).all();

  for (const record of history) {
    const age = now - record.accessed_at;
    const weight = getTimeWeight(age);
    const actionMultiplier = getActionMultiplier(record.action);

    const current = scores.get(record.repo_path) || 0;
    scores.set(record.repo_path, current + (weight * actionMultiplier));
  }

  // Save scores
  for (const [repo, score] of scores) {
    this.db.prepare(`
      INSERT OR REPLACE INTO frecency_scores (repo_path, score, last_updated)
      VALUES (?, ?, ?)
    `).run(repo, score, now);
  }
}

function getTimeWeight(age: number): number {
  const days = age / (1000 * 60 * 60 * 24);

  if (days < 4) return 100;      // Very recent
  if (days < 14) return 70;      // Recent
  if (days < 30) return 50;      // This month
  if (days < 90) return 30;      // This quarter
  return 10;                     // Older
}
```

## State Management

### Component State

**Local State (useState):**
- UI state (selected index, expanded groups)
- Form inputs (filter query, edit values)
- Transient state (loading, notifications)

**Derived State (useMemo):**
- Filtered repositories
- Grouped repositories
- Sorted lists
- Computed counts

**Effects (useEffect):**
- Load repos on mount
- Auto-refresh timer
- Keyboard listeners
- Cleanup subscriptions

### Performance Patterns

**Memoization:**
```typescript
const filteredRepos = useMemo(() => {
  return filterRepos(repos, filterQuery);
}, [repos, filterQuery]);

const groupedRepos = useMemo(() => {
  return groupRepos(filteredRepos);
}, [filteredRepos]);
```

**Stable Callbacks:**
```typescript
const handleToggleFavorite = useCallback((path: string) => {
  configManager.toggleFavorite(path);
  loadRepos(); // Refresh
}, [loadRepos]);
```

## Testing Strategy

### Test Pyramid

```
         ┌─────────┐
         │   E2E   │  0 tests (manual)
         │ (Manual)│
         └─────────┘
        ┌───────────┐
        │Integration│  13 tests
        │   Tests   │
        └───────────┘
    ┌───────────────────┐
    │   Component Tests │  150 tests
    │   (Ink Testing)   │
    └───────────────────┘
┌─────────────────────────────┐
│       Unit Tests            │  118 tests
│  (Services + Utilities)     │
└─────────────────────────────┘
```

**Total: 281 tests**

### Unit Tests (118 tests)

- `database.test.ts` (20 tests) - SQLite operations
- `gitScanner.test.ts` (13 tests) - Repository scanning
- `gitStatus.test.ts` (12 tests) - Status fetching
- `colors.test.ts` (24 tests) - Color utilities
- `keybindings.test.ts` (21 tests) - Keybinding constants

### Component Tests (150 tests)

- `Dashboard.test.tsx` (45 tests) - Main navigation, state
- `Dashboard.additional.test.tsx` (18 tests) - Edge cases
- `DetailView.test.tsx` (15 tests)
- `SettingsView.test.tsx` (20 tests)
- And more...

### Integration Tests (13 tests)

- Repo discovery → status workflow
- Database + favorites integration
- Database + search history integration
- Error handling
- Concurrent operations

## Performance Considerations

### Scanning Performance

**Benchmarks:**
- 100 repos: ~500ms
- 500 repos: ~2s
- 1000 repos: ~5s

**Optimizations:**
1. Parallel traversal with Promise.all()
2. Early exit at `.git` directories
3. Exclude patterns checked before descending
4. Depth limit (default: 5)

### Rendering Performance

**Solutions:**
1. Memoization for filtered/grouped results
2. Stable callbacks prevent re-renders
3. Debounced input (300ms)

### Database Performance

**Query Performance:**
- Prepared statements for reuse
- Indexes on repo_path and accessed_at
- Batch inserts with transactions
- Cleanup of old data (>90 days)

## Security

### Credential Storage

**AI API Keys:**
- Stored in `~/.config/delta-scope/settings.json`
- File permissions: 600 (user read/write only)
- Never logged or transmitted except to AI provider

**Git Credentials:**
- Delta-scope uses system git
- Inherits credentials from ~/.gitconfig
- No credential storage in delta-scope

### Dangerous Operations

**Validation:**
```typescript
if (DANGEROUS_COMMANDS.has(action.command)) {
  const confirmed = await confirmDialog.show();
  if (!confirmed) return;
}
```

**Confirmation Dialog:**
- Shows affected repos
- Explains what will happen
- Mentions rollback possibility
- Requires explicit 'y' key

### Input Sanitization

**File Paths:**
```typescript
function isValidRepoPath(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (path.includes('..')) return false; // No path traversal
  if (!fs.existsSync(path)) return false;
  return true;
}
```

**SQL Injection:**
```typescript
// Always use prepared statements
db.prepare('SELECT * FROM repos WHERE path = ?').get(repoPath);

// Never:
db.exec(`SELECT * FROM repos WHERE path = '${repoPath}'`); // ❌
```

## Future Architecture

### Plugin System

Allow users to extend delta-scope:

```typescript
interface Plugin {
  name: string;
  version: string;

  onRepoLoad?(repos: GitRepo[]): GitRepo[];
  onAIAnalysis?(context: AgentContext): AgentContext;
  onAction?(action: Action): Promise<ActionResult>;

  commands?: {
    [key: string]: (args: any) => Promise<void>;
  };
}
```

### Streaming AI Responses

Show recommendations as they're generated:

```typescript
async function* streamAnalysis(context: AgentContext) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...],
    stream: true,
  });

  for await (const chunk of stream) {
    yield chunk.choices[0]?.delta?.content;
  }
}
```

---

## References

- **Ink**: https://github.com/vadimdemedes/ink
- **simple-git**: https://github.com/steveukx/git-js
- **better-sqlite3**: https://github.com/WiseLibs/better-sqlite3
- **Vitest**: https://vitest.dev/
- **TypeScript**: https://www.typescriptlang.org/

---

*This document describes the current architecture as of version with 281 passing tests.*
