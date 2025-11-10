# Delta-Scope Architecture & Design Document

**Version:** 0.2.0 (Draft)
**Status:** Planning Phase
**Last Updated:** 2025-11-09

---

## Vision & Scope

Delta-scope is evolving from a simple TUI repo viewer into a **comprehensive development workspace manager** with:
- Persistent repo tracking across sessions and machines
- Event-driven architecture for extensibility
- Cross-computer sync and repo cloning
- AI-assisted repo classification, suggestions, and task coordination

### Target Users
- Developers managing 20+ repositories
- Polyglot developers switching between projects
- Developers working across multiple machines
- Teams coordinating work across many repos

---

## Current State Assessment

### What Works (v0.1.0)
✅ **Core TUI:** Ink-based interface with basic display
✅ **Repo Discovery:** Recursive scanning for git repos
✅ **Status Detection:** Git status, branch, changes, unpushed commits
✅ **Grouping:** Status-based grouping (clean, uncommitted, unpushed, both)
✅ **Configuration:** Persistent config with base paths, exclusions, favorites

### Critical Issues (from Code Review)
🔴 **Broken Navigation:** Can't select individual repos (only group headers)
🔴 **Missing Features:** Filter, detail view, favorite toggle advertised but not implemented
🔴 **No Persistence:** Repos re-scanned every time, no history
🔴 **No Tests:** Service layer completely untested
🔴 **Performance:** Synchronous blocking, no optimization for 100+ repos

### Technical Debt
- Dashboard component too large (272 lines, multiple responsibilities)
- Silent error handling (no logging or user feedback)
- No state persistence (sort mode, selection reset on restart)
- Unused config options (theme, refreshInterval)

---

## Architectural Layers

### Proposed Architecture (v0.2.0+)

```
┌─────────────────────────────────────────────────────────────┐
│                        Presentation Layer                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ TUI (Ink/React)                                       │   │
│  │ - Dashboard, RepoList, DetailView, FilterView, etc.  │   │
│  │ - Keyboard handlers, UI state management             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ (Events, State)
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ State Management (Zustand or Context+Reducer)        │   │
│  │ - UI state, selections, filters                      │   │
│  │ - Derived state (grouped repos, filtered results)    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Event System (EventEmitter)                          │   │
│  │ - repo:discovered, repo:changed, repo:removed        │   │
│  │ - sync:started, sync:completed                       │   │
│  │ - ai:classified, ai:suggested                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Hook System (Plugin Architecture)                    │   │
│  │ - Pre/post hooks for repo discovery, status checks   │   │
│  │ - User-defined hooks for custom automation           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ (Commands, Queries)
┌─────────────────────────────────────────────────────────────┐
│                       Business Logic Layer                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Repo Management Service                              │   │
│  │ - Discovery, tracking, lifecycle management          │   │
│  │ - Duplicate detection, move detection                │   │
│  │ - Ghost repo tracking (removed from disk)            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Git Operations Service                               │   │
│  │ - Status checks, commit history, diffs               │   │
│  │ - Branch operations, remote operations               │   │
│  │ - Batch operations, parallel execution               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Sync Service                                         │   │
│  │ - Import/export repo catalog                         │   │
│  │ - Clone repos from dump file                         │   │
│  │ - Conflict resolution (different paths, versions)    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ AI Service (Future)                                  │   │
│  │ - Repo classification (by description, structure)    │   │
│  │ - Intelligent suggestions (what to work on next)     │   │
│  │ - Itinerary generation (coordinate work over time)   │   │
│  │ - Reminder system (don't lose track of work)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ (CRUD, Queries)
┌─────────────────────────────────────────────────────────────┐
│                      Persistence Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Database (better-sqlite3)                            │   │
│  │ - SQLite for local persistence                       │   │
│  │ - Repositories table (path, status, metadata)        │   │
│  │ - RepoHistory table (track changes over time)        │   │
│  │ - Machines table (track different computers)         │   │
│  │ - SyncLog table (import/export history)              │   │
│  │ - AIClassifications table (cached AI results)        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Repository Pattern                                   │   │
│  │ - RepoRepository: CRUD for repos                     │   │
│  │ - HistoryRepository: Query history                   │   │
│  │ - SyncRepository: Manage sync operations             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Persistence Layer Design (TinySQL/SQLite)

### Why SQLite (better-sqlite3)?

**Advantages:**
- ✅ Zero-config, file-based (perfect for CLI tool)
- ✅ ACID transactions (data integrity)
- ✅ Fast for local operations
- ✅ Cross-platform (same DB file works on Windows/Mac/Linux)
- ✅ SQL queries for complex filtering/sorting
- ✅ Built-in full-text search (for repo names, descriptions)
- ✅ Excellent TypeScript support with `better-sqlite3`

**vs. In-Memory Only:**
- Persistent history across sessions
- Can track repos even when not present on disk
- Enables sync between machines
- Foundation for AI features (cache classifications)

### Database Schema (v1)

```sql
-- Core repositories table
CREATE TABLE repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,           -- Absolute path on current machine
  name TEXT NOT NULL,                  -- Repo name (derived from path)
  machine_id INTEGER NOT NULL,         -- Which machine this path is on

  -- Git metadata (cached, refreshed periodically)
  current_branch TEXT,
  default_branch TEXT,
  remote_url TEXT,

  -- Status tracking
  status TEXT CHECK(status IN ('clean', 'uncommitted', 'unpushed', 'both', 'ghost')),
  uncommitted_files INTEGER DEFAULT 0,
  unpushed_commits INTEGER DEFAULT 0,
  lines_added INTEGER DEFAULT 0,
  lines_deleted INTEGER DEFAULT 0,

  -- Lifecycle tracking
  first_seen_at DATETIME NOT NULL,     -- When first discovered
  last_seen_at DATETIME NOT NULL,      -- Last time found during scan
  last_status_check DATETIME,          -- Last git status check
  is_present BOOLEAN DEFAULT 1,        -- Still exists on disk?
  is_favorite BOOLEAN DEFAULT 0,

  -- User metadata
  description TEXT,                     -- User-provided description
  tags TEXT,                            -- JSON array of tags

  -- AI metadata (future)
  ai_classification TEXT,               -- JSON: {category, language, framework, etc}
  ai_last_classified DATETIME,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (machine_id) REFERENCES machines(id)
);

-- Index for fast lookups
CREATE INDEX idx_repo_path ON repositories(path);
CREATE INDEX idx_repo_status ON repositories(status);
CREATE INDEX idx_repo_machine ON repositories(machine_id);
CREATE INDEX idx_repo_present ON repositories(is_present);
CREATE INDEX idx_repo_favorite ON repositories(is_favorite);

-- Machines table (track different computers)
CREATE TABLE machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL UNIQUE,
  os_type TEXT NOT NULL,              -- 'linux', 'darwin', 'win32'
  username TEXT NOT NULL,
  home_dir TEXT NOT NULL,

  is_current BOOLEAN DEFAULT 0,       -- Is this the current machine?

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Repository history (track changes over time)
CREATE TABLE repo_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,

  -- What changed?
  event_type TEXT CHECK(event_type IN ('discovered', 'status_changed', 'moved', 'removed', 'restored')),

  -- Previous and new values
  old_path TEXT,
  new_path TEXT,
  old_status TEXT,
  new_status TEXT,

  -- Metadata
  details TEXT,                        -- JSON with additional context

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE INDEX idx_history_repo ON repo_history(repo_id);
CREATE INDEX idx_history_event ON repo_history(event_type);
CREATE INDEX idx_history_created ON repo_history(created_at);

-- Sync log (track imports/exports)
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  operation TEXT CHECK(operation IN ('export', 'import')),
  source_machine_id INTEGER,
  target_machine_id INTEGER,

  repos_count INTEGER,                 -- How many repos in this sync
  file_path TEXT,                      -- Path to dump file

  status TEXT CHECK(status IN ('started', 'completed', 'failed')),
  error TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,

  FOREIGN KEY (source_machine_id) REFERENCES machines(id),
  FOREIGN KEY (target_machine_id) REFERENCES machines(id)
);

-- AI classifications cache (future)
CREATE TABLE ai_classifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL UNIQUE,

  category TEXT,                       -- 'web-app', 'library', 'tool', etc.
  primary_language TEXT,
  frameworks TEXT,                     -- JSON array
  confidence REAL,                     -- 0.0 - 1.0

  suggested_actions TEXT,              -- JSON array of suggestions

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

-- User itineraries (future - AI-generated work plans)
CREATE TABLE itineraries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  title TEXT NOT NULL,
  description TEXT,

  status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- AI-generated
  generated_by TEXT,                   -- 'ai', 'user'
  reasoning TEXT,                      -- Why this itinerary?

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Itinerary items (repos to work on, in order)
CREATE TABLE itinerary_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  itinerary_id INTEGER NOT NULL,
  repo_id INTEGER NOT NULL,

  order_index INTEGER NOT NULL,       -- Order in itinerary

  task_description TEXT,              -- What to do with this repo
  estimated_duration TEXT,            -- '30 minutes', '2 hours', etc.

  status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'skipped')),

  completed_at DATETIME,

  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

-- Reminders (don't lose track of work)
CREATE TABLE reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,

  message TEXT NOT NULL,

  remind_at DATETIME NOT NULL,
  reminded_at DATETIME,

  is_recurring BOOLEAN DEFAULT 0,
  recurrence_rule TEXT,               -- 'daily', 'weekly', etc.

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE INDEX idx_reminders_repo ON reminders(repo_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
```

### Repository Pattern Implementation

```typescript
// src/db/repositories/RepoRepository.ts

import Database from 'better-sqlite3';
import type { GitRepo } from '../../types/index.js';

export interface DbRepo {
  id: number;
  path: string;
  name: string;
  machine_id: number;
  current_branch: string | null;
  status: 'clean' | 'uncommitted' | 'unpushed' | 'both' | 'ghost';
  is_present: boolean;
  is_favorite: boolean;
  // ... all other fields
}

export class RepoRepository {
  constructor(private db: Database.Database) {}

  /**
   * Insert or update a repository
   * If path exists, update metadata. If not, insert new.
   */
  upsert(repo: Partial<DbRepo>): DbRepo {
    const existing = this.findByPath(repo.path!);

    if (existing) {
      return this.update(existing.id, repo);
    } else {
      return this.insert(repo);
    }
  }

  /**
   * Find repository by path
   */
  findByPath(path: string): DbRepo | null {
    const stmt = this.db.prepare('SELECT * FROM repositories WHERE path = ?');
    return stmt.get(path) as DbRepo | null;
  }

  /**
   * Find all present repositories (currently on disk)
   */
  findAllPresent(): DbRepo[] {
    const stmt = this.db.prepare('SELECT * FROM repositories WHERE is_present = 1');
    return stmt.all() as DbRepo[];
  }

  /**
   * Find ghost repositories (removed from disk but tracked)
   */
  findGhosts(): DbRepo[] {
    const stmt = this.db.prepare('SELECT * FROM repositories WHERE is_present = 0');
    return stmt.all() as DbRepo[];
  }

  /**
   * Mark repository as removed (ghost)
   */
  markAsGhost(id: number): void {
    const stmt = this.db.prepare('UPDATE repositories SET is_present = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);

    // Log history event
    this.logHistoryEvent(id, 'removed', {});
  }

  /**
   * Detect moved repositories
   * Returns repos with same remote_url but different path
   */
  detectMoved(remoteUrl: string, currentPath: string): DbRepo | null {
    const stmt = this.db.prepare(`
      SELECT * FROM repositories
      WHERE remote_url = ?
        AND path != ?
        AND is_present = 0
      LIMIT 1
    `);
    return stmt.get(remoteUrl, currentPath) as DbRepo | null;
  }

  /**
   * Detect duplicates
   * Returns repos with same remote_url, both present
   */
  detectDuplicates(remoteUrl: string): DbRepo[] {
    const stmt = this.db.prepare(`
      SELECT * FROM repositories
      WHERE remote_url = ?
        AND is_present = 1
    `);
    return stmt.all(remoteUrl) as DbRepo[];
  }

  // ... other CRUD methods

  private logHistoryEvent(repoId: number, eventType: string, details: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO repo_history (repo_id, event_type, details)
      VALUES (?, ?, ?)
    `);
    stmt.run(repoId, eventType, JSON.stringify(details));
  }
}
```

---

## Event System & Hooks

### Event Types

```typescript
// src/events/types.ts

export type RepoEvent =
  | { type: 'repo:discovered'; repo: GitRepo }
  | { type: 'repo:status_changed'; repo: GitRepo; oldStatus: string }
  | { type: 'repo:moved'; repo: GitRepo; oldPath: string; newPath: string }
  | { type: 'repo:removed'; repo: GitRepo }
  | { type: 'repo:restored'; repo: GitRepo }
  | { type: 'repo:duplicate_detected'; repos: GitRepo[] };

export type SyncEvent =
  | { type: 'sync:started'; operation: 'import' | 'export'; machine: string }
  | { type: 'sync:completed'; operation: 'import' | 'export'; reposCount: number }
  | { type: 'sync:failed'; operation: 'import' | 'export'; error: Error };

export type AIEvent =
  | { type: 'ai:classified'; repo: GitRepo; classification: Classification }
  | { type: 'ai:suggested'; suggestions: Suggestion[] }
  | { type: 'ai:itinerary_generated'; itinerary: Itinerary };

export type AppEvent = RepoEvent | SyncEvent | AIEvent;
```

### Event Emitter

```typescript
// src/events/EventBus.ts

import EventEmitter from 'events';
import type { AppEvent } from './types.js';

class EventBus extends EventEmitter {
  emit(event: AppEvent['type'], data: any): boolean {
    return super.emit(event, data);
  }

  on(event: AppEvent['type'], listener: (data: any) => void): this {
    return super.on(event, listener);
  }
}

export const eventBus = new EventBus();
```

### Hook System

```typescript
// src/hooks/types.ts

export type Hook = {
  name: string;
  description?: string;
  event: string;                    // Event to listen for
  action: (data: any) => void | Promise<void>;
  enabled: boolean;
};

// Example hooks

export const builtInHooks: Hook[] = [
  {
    name: 'log-discoveries',
    description: 'Log newly discovered repositories',
    event: 'repo:discovered',
    action: (data) => {
      console.log(`[HOOK] Discovered: ${data.repo.path}`);
    },
    enabled: true,
  },
  {
    name: 'detect-duplicates',
    description: 'Check for duplicate repos on discovery',
    event: 'repo:discovered',
    action: async (data) => {
      const duplicates = await repoRepository.detectDuplicates(data.repo.remote_url);
      if (duplicates.length > 1) {
        eventBus.emit('repo:duplicate_detected', { repos: duplicates });
      }
    },
    enabled: true,
  },
  {
    name: 'track-moves',
    description: 'Detect when repos have been moved',
    event: 'repo:discovered',
    action: async (data) => {
      const moved = await repoRepository.detectMoved(data.repo.remote_url, data.repo.path);
      if (moved) {
        eventBus.emit('repo:moved', {
          repo: data.repo,
          oldPath: moved.path,
          newPath: data.repo.path
        });
      }
    },
    enabled: true,
  },
];
```

### User-Defined Hooks

```typescript
// ~/.config/delta-scope/hooks/my-custom-hook.js

module.exports = {
  name: 'notify-on-uncommitted',
  description: 'Desktop notification when uncommitted repos exceed threshold',
  event: 'repo:status_changed',
  action: async (data) => {
    if (data.repo.status === 'uncommitted' || data.repo.status === 'both') {
      const allUncommitted = await countUncommittedRepos();
      if (allUncommitted > 10) {
        notify({
          title: 'Delta-Scope Alert',
          message: `You have ${allUncommitted} repos with uncommitted changes!`,
        });
      }
    }
  },
  enabled: true,
};
```

---

## Repo Lifecycle Tracking

### States

```
┌─────────────┐
│  UNKNOWN    │  (Never seen before)
└─────────────┘
       ↓ (Discovery scan)
┌─────────────┐
│ DISCOVERED  │  (First time found, added to DB)
└─────────────┘
       ↓ (Regular scans)
┌─────────────┐
│  PRESENT    │  (Exists on disk, tracked in DB)
└─────────────┘
       ↓ (Not found during scan)
┌─────────────┐
│   GHOST     │  (Removed from disk, but tracked in DB)
└─────────────┘
       ↓ (Found again during scan)
┌─────────────┐
│  RESTORED   │  (Was ghost, now present again)
└─────────────┘
       ↓ (Different path, same remote_url)
┌─────────────┐
│   MOVED     │  (Detected at new location)
└─────────────┘
       ↓ (Multiple copies with same remote_url)
┌─────────────┐
│ DUPLICATED  │  (Same repo exists in multiple places)
└─────────────┘
```

### Detection Logic

```typescript
// src/services/RepoLifecycleService.ts

export class RepoLifecycleService {
  constructor(
    private repoRepository: RepoRepository,
    private eventBus: EventBus
  ) {}

  /**
   * Process discovered repo and determine lifecycle state
   */
  async processDiscoveredRepo(scannedRepo: GitRepo): Promise<void> {
    const existing = this.repoRepository.findByPath(scannedRepo.path);

    if (!existing) {
      // New discovery
      const inserted = this.repoRepository.insert({
        path: scannedRepo.path,
        name: scannedRepo.name,
        is_present: true,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        // ... other fields
      });

      this.eventBus.emit('repo:discovered', { repo: scannedRepo });

    } else if (!existing.is_present) {
      // Was a ghost, now restored
      this.repoRepository.update(existing.id, {
        is_present: true,
        last_seen_at: new Date(),
      });

      this.eventBus.emit('repo:restored', { repo: scannedRepo });

    } else {
      // Already known and present, just update metadata
      this.repoRepository.update(existing.id, {
        last_seen_at: new Date(),
        current_branch: scannedRepo.branch,
        status: scannedRepo.status,
        // ... other fields
      });

      if (existing.status !== scannedRepo.status) {
        this.eventBus.emit('repo:status_changed', {
          repo: scannedRepo,
          oldStatus: existing.status
        });
      }
    }

    // Check for duplicates
    if (scannedRepo.remotes.length > 0) {
      await this.checkForDuplicates(scannedRepo);
    }

    // Check if it moved
    if (scannedRepo.remotes.length > 0) {
      await this.checkForMoves(scannedRepo);
    }
  }

  /**
   * After scan, mark repos not found as ghosts
   */
  async markMissingAsGhosts(scannedPaths: Set<string>): Promise<void> {
    const allPresent = this.repoRepository.findAllPresent();

    for (const repo of allPresent) {
      if (!scannedPaths.has(repo.path)) {
        this.repoRepository.markAsGhost(repo.id);
        this.eventBus.emit('repo:removed', { repo });
      }
    }
  }

  // ... duplicate and move detection methods
}
```

---

## Cross-Computer Sync

### Export Format (JSON)

```typescript
// Dump file format

interface RepoDump {
  version: string;
  exported_at: string;
  source_machine: {
    hostname: string;
    os_type: string;
    username: string;
    home_dir: string;
  };
  repositories: Array<{
    path: string;                    // Path on source machine
    relative_path?: string;          // Path relative to home dir (for portability)
    name: string;
    current_branch: string;
    default_branch: string;
    remote_url: string;              // Key for matching across machines
    status: string;
    is_favorite: boolean;
    description?: string;
    tags?: string[];

    // For cloning on target machine
    can_clone: boolean;
    clone_url?: string;
  }>;
}
```

### Export Command

```typescript
// src/commands/export.ts

export async function exportRepos(outputPath: string): Promise<void> {
  const repos = repoRepository.findAllPresent();

  const dump: RepoDump = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    source_machine: {
      hostname: os.hostname(),
      os_type: os.type(),
      username: os.userInfo().username,
      home_dir: os.homedir(),
    },
    repositories: repos.map(repo => ({
      path: repo.path,
      relative_path: path.relative(os.homedir(), repo.path),
      name: repo.name,
      current_branch: repo.current_branch,
      remote_url: repo.remote_url,
      status: repo.status,
      is_favorite: repo.is_favorite,
      can_clone: !!repo.remote_url,
      clone_url: repo.remote_url,
    })),
  };

  await fs.writeFile(outputPath, JSON.stringify(dump, null, 2));
  console.log(`Exported ${repos.length} repos to ${outputPath}`);
}
```

### Import & Clone Command

```typescript
// src/commands/import.ts

export async function importAndClone(
  dumpPath: string,
  targetBaseDir: string,
  options: {
    dryRun?: boolean;
    interactive?: boolean;
    mapPaths?: Record<string, string>;  // Map source paths to target paths
  }
): Promise<void> {
  const dump: RepoDump = JSON.parse(await fs.readFile(dumpPath, 'utf-8'));

  console.log(`Importing ${dump.repositories.length} repos from ${dump.source_machine.hostname}`);

  for (const repo of dump.repositories) {
    // Determine target path
    let targetPath: string;

    if (options.mapPaths && options.mapPaths[repo.path]) {
      targetPath = options.mapPaths[repo.path];
    } else if (repo.relative_path) {
      targetPath = path.join(os.homedir(), repo.relative_path);
    } else {
      targetPath = path.join(targetBaseDir, repo.name);
    }

    // Check if already exists locally
    const existing = repoRepository.findByPath(targetPath);

    if (existing && existing.is_present) {
      console.log(`⏭️  Skip: ${repo.name} (already exists at ${targetPath})`);
      continue;
    }

    if (!repo.can_clone) {
      console.log(`❌ Skip: ${repo.name} (no remote URL to clone from)`);
      continue;
    }

    if (options.interactive) {
      const answer = await promptUser(`Clone ${repo.name} to ${targetPath}?`);
      if (!answer) continue;
    }

    if (options.dryRun) {
      console.log(`[DRY RUN] Would clone ${repo.clone_url} to ${targetPath}`);
      continue;
    }

    // Clone the repository
    try {
      await git.clone(repo.clone_url, targetPath);
      console.log(`✅ Cloned: ${repo.name} to ${targetPath}`);

      // Add to local database
      repoRepository.insert({
        path: targetPath,
        name: repo.name,
        remote_url: repo.remote_url,
        is_present: true,
        is_favorite: repo.is_favorite,
        description: repo.description,
        // ... other fields
      });

    } catch (error) {
      console.error(`❌ Failed to clone ${repo.name}: ${error.message}`);
    }
  }
}
```

### CLI Commands

```bash
# Export current machine's repos
delta-scope export ~/my-repos.json

# Import and clone repos from another machine
delta-scope import ~/my-repos.json --target ~/projects --interactive

# Dry run (show what would be cloned)
delta-scope import ~/my-repos.json --target ~/projects --dry-run

# Map paths from source to target
delta-scope import ~/my-repos.json --map /Users/old/projects=/home/new/code
```

---

## AI Integration (Future Phases)

### Classification

```typescript
// src/services/AIService.ts

interface Classification {
  category: 'web-app' | 'library' | 'cli-tool' | 'mobile-app' | 'data-science' | 'game' | 'other';
  primary_language: string;
  frameworks: string[];
  confidence: number;
  reasoning: string;
}

export class AIService {
  constructor(
    private provider: 'anthropic' | 'openai' | 'local',
    private apiKey?: string
  ) {}

  /**
   * Classify a repository based on its structure and content
   */
  async classifyRepo(repoPath: string): Promise<Classification> {
    // Gather repo metadata
    const files = await this.listFiles(repoPath);
    const packageJson = await this.readIfExists(path.join(repoPath, 'package.json'));
    const readme = await this.readIfExists(path.join(repoPath, 'README.md'));

    // Build context for AI
    const context = {
      files: files.slice(0, 50),  // First 50 files
      packageJson: packageJson ? JSON.parse(packageJson) : null,
      readmeSnippet: readme?.slice(0, 500),
    };

    // Call AI provider
    const prompt = `
      Classify this git repository based on its structure:

      Files: ${context.files.join(', ')}
      Package.json: ${JSON.stringify(context.packageJson, null, 2)}
      README snippet: ${context.readmeSnippet}

      Provide classification as JSON with: category, primary_language, frameworks, confidence (0-1), reasoning.
    `;

    const response = await this.callAI(prompt);
    return JSON.parse(response);
  }

  /**
   * Generate suggestions for what to do with repos
   */
  async generateSuggestions(repos: GitRepo[]): Promise<Suggestion[]> {
    const prompt = `
      I have ${repos.length} git repositories in various states:
      - ${repos.filter(r => r.status === 'uncommitted').length} with uncommitted changes
      - ${repos.filter(r => r.status === 'unpushed').length} with unpushed commits
      - ${repos.filter(r => r.status === 'both').length} with both

      Suggest actions to take, prioritized by urgency.
    `;

    const response = await this.callAI(prompt);
    return JSON.parse(response);
  }

  /**
   * Generate an itinerary (coordinated work plan)
   */
  async generateItinerary(repos: GitRepo[], userGoal: string): Promise<Itinerary> {
    const classifications = await Promise.all(
      repos.map(r => this.getOrClassify(r.path))
    );

    const prompt = `
      User goal: "${userGoal}"

      I have ${repos.length} repositories:
      ${repos.map((r, i) => `- ${r.name}: ${r.status}, ${classifications[i].category}`).join('\n')}

      Create an itinerary to help achieve the user's goal. Order repos by priority,
      suggest what to do with each, and estimate time needed.
    `;

    const response = await this.callAI(prompt);
    return JSON.parse(response);
  }

  private async callAI(prompt: string): Promise<string> {
    switch (this.provider) {
      case 'anthropic':
        return this.callAnthropic(prompt);
      case 'openai':
        return this.callOpenAI(prompt);
      case 'local':
        return this.callLocalModel(prompt);
    }
  }

  // Provider-specific implementations...
}
```

### Reminder System

```typescript
// src/services/ReminderService.ts

export class ReminderService {
  constructor(
    private db: Database.Database,
    private eventBus: EventBus
  ) {
    this.startReminderCheck();
  }

  /**
   * Create a reminder for a repository
   */
  createReminder(repoId: number, message: string, remindAt: Date): void {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (repo_id, message, remind_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(repoId, message, remindAt.toISOString());
  }

  /**
   * Check for due reminders every minute
   */
  private startReminderCheck(): void {
    setInterval(() => {
      const stmt = this.db.prepare(`
        SELECT r.*, repos.name as repo_name, repos.path as repo_path
        FROM reminders r
        JOIN repositories repos ON r.repo_id = repos.id
        WHERE r.remind_at <= datetime('now')
          AND r.reminded_at IS NULL
      `);

      const dueReminders = stmt.all();

      for (const reminder of dueReminders) {
        this.sendReminder(reminder);
      }
    }, 60000);  // Every minute
  }

  private sendReminder(reminder: any): void {
    // Desktop notification
    notify({
      title: `Delta-Scope Reminder: ${reminder.repo_name}`,
      message: reminder.message,
      actions: ['View Repo', 'Dismiss'],
    });

    // Mark as reminded
    const stmt = this.db.prepare(`
      UPDATE reminders
      SET reminded_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(reminder.id);

    this.eventBus.emit('reminder:triggered', { reminder });
  }
}
```

---

## Implementation Roadmap

### Phase 1.5: Fix Critical Issues (Week 1-2)
**Goal:** Make current features actually work

- [ ] Fix navigation (enable individual repo selection)
- [ ] Add Dashboard tests
- [ ] Implement fuzzy filter
- [ ] Implement detail view
- [ ] Connect favorite toggle
- [ ] Add service layer tests
- [ ] Fix React hooks warnings
- [ ] Add visual selection indicator

**Deliverable:** Functional MVP matching README promises

---

### Phase 2: Persistence Foundation (Week 3-4)
**Goal:** Add SQLite database and repo lifecycle tracking

- [ ] Install better-sqlite3
- [ ] Create database schema (migrations)
- [ ] Implement Repository pattern (RepoRepository, etc.)
- [ ] Implement lifecycle tracking (discovered, moved, removed, restored)
- [ ] Implement event system (EventBus)
- [ ] Implement basic hooks (log discoveries, track moves)
- [ ] Add duplicate detection
- [ ] Add ghost repo view (see removed repos)
- [ ] Update TUI to show lifecycle info

**Deliverable:** Persistent repo tracking with history

---

### Phase 3: Sync & Multi-Machine (Week 5-6)
**Goal:** Enable cross-computer workflows

- [ ] Implement machines table and tracking
- [ ] Implement export command (dump to JSON)
- [ ] Implement import command (read dump, compare with local)
- [ ] Implement clone command (batch clone repos from dump)
- [ ] Add path mapping (source → target path translation)
- [ ] Add interactive mode for import
- [ ] Add dry-run mode
- [ ] Create sync UI in TUI (show import/export status)

**Deliverable:** Sync repos between machines

---

### Phase 4: AI Integration (Week 7-10)
**Goal:** Intelligent classification and suggestions

- [ ] Design AI service architecture (pluggable providers)
- [ ] Implement Anthropic Claude provider
- [ ] Implement OpenAI provider
- [ ] Implement local model provider (llama.cpp)
- [ ] Implement repo classification
- [ ] Cache classifications in DB
- [ ] Implement suggestion generation
- [ ] Implement itinerary generation
- [ ] Add AI classification view in TUI
- [ ] Add suggestion panel in TUI

**Deliverable:** AI-powered repo insights

---

### Phase 5: Reminders & Coordination (Week 11-12)
**Goal:** Help users stay on track

- [ ] Implement reminder system
- [ ] Add desktop notifications
- [ ] Add itinerary management UI
- [ ] Add task tracking (mark items complete)
- [ ] Add recurring reminders
- [ ] Add "what should I work on next?" command
- [ ] Add time tracking integration (optional)

**Deliverable:** AI-assisted work coordination

---

### Phase 6: Advanced Features (Week 13+)
**Future enhancements**

- [ ] Git operations from TUI (commit, push, pull)
- [ ] Quick actions (open in editor, terminal)
- [ ] Team features (share itineraries, recommendations)
- [ ] Plugin system for custom hooks
- [ ] Web dashboard (optional)
- [ ] Mobile companion app (optional)

---

## Architecture Decisions ✅

**Status:** Finalized 2025-11-09
**Decided By:** Jeffrey Blake

1. **Database Location**
   - **Decision:** `~/.local/share/delta-scope/delta-scope.db` (configurable)
   - **Configuration:** `settings.json` → `database.location`
   - **Rationale:** Follows XDG Base Directory spec (data in ~/.local/share, config in ~/.config)
   - **Configurable:** Yes, users can override in settings

2. **AI Provider Default**
   - **Decision:** Local model (privacy-first)
   - **Configuration:** `settings.json` → `ai.provider` (default: "local")
   - **Options:** local (llama3), anthropic (Claude), openai (GPT-4)
   - **Rationale:** Privacy-first by default, no API key required, works offline
   - **Note:** AI features disabled by default (`ai.enabled: false`)

3. **Workflow Execution**
   - **Decision:** Separate daemon process
   - **Configuration:** `settings.json` → `workflows.daemon.enabled` (default: true)
   - **Communication:** IPC (port 3857) or shared files
   - **Benefits:** Non-blocking, runs when TUI closed, survives crashes
   - **Implementation:** Phase 3 (v0.3.0)

4. **Ghost Repo Cleanup**
   - **Decision:** Keep forever by default (user-configurable)
   - **Configuration:** `settings.json` → `database.ghost_retention_days` (default: 0)
   - **Values:** 0 = keep forever, >0 = auto-delete after N days
   - **Rationale:** Users may want to restore old repos, disk space is cheap

5. **Event Hook Security**
   - **Decision:** Trust user by default (no sandbox, configurable)
   - **Configuration:** `settings.json` → `hooks.sandbox_enabled` (default: false)
   - **Options:** false = trust user, true = sandbox with vm2
   - **Rationale:** Power users, simpler implementation, can add sandbox later
   - **Future:** May add sandbox option in Phase 4 for shared hooks

6. **Sync Conflict Resolution**
   - **Decision:** Prompt user interactively (Option C)
   - **Fallback:** Skip if in non-interactive mode
   - **Rationale:** Most flexible, lets user decide per-repo

---

## Next Steps

### Immediate (Phase 1 - v0.2.0)
1. ✅ **Architecture decisions made** - All decisions finalized
2. ⏳ **Fix critical issues** - Navigation, tests, linting (Week 1)
3. ⏳ **Complete MVP features** - Filter, detail view, favorites (Week 2-3)
4. ⏳ **Achieve 70% test coverage** - Add Dashboard and service tests

### Phase 2 (v0.3.0)
5. **Create schema migrations** - SQL migration files for better-sqlite3
6. **Implement persistence layer** - RepoRepository, HistoryRepository, etc.
7. **Build event system** - EventBus and hook system
8. **Add workflow daemon** - Separate process for background tasks

### Phase 3 (v0.4.0)
9. **Implement sync** - Export/import/clone across machines
10. **Add path mapping** - Adapt repos to different machine structures

### Phase 4 (v1.0.0)
11. **Integrate AI** - Classification, suggestions, itineraries
12. **Add reminders** - Time-based notifications

---

**Document Status:** ✅ Approved - Ready for Implementation
**Next Review:** After Phase 1 (v0.2.0) complete
**Implementation:** Starting Phase 1 Week 1
