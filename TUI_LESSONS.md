# TUI Design Lessons & Best Practices

**Purpose:** Research findings on terminal user interface design patterns, usability principles, and best practices to ensure delta-scope is a pleasure to use.

**Date:** 2025-11-10

---

## Table of Contents
1. [What Makes a Good TUI](#what-makes-a-good-tui)
2. [Design Patterns from Popular TUIs](#design-patterns-from-popular-tuis)
3. [Navigation Patterns](#navigation-patterns)
4. [Frecency & History Management](#frecency--history-management)
5. [Settings & Configuration](#settings--configuration)
6. [Visual Design Principles](#visual-design-principles)
7. [Actionable Recommendations for delta-scope](#actionable-recommendations-for-delta-scope)

---

## What Makes a Good TUI

### Core Philosophy
Terminal User Interfaces represent a middle ground between command-line tools and graphical applications, rendering sophisticated interfaces using Unicode characters, ANSI color codes, and clever positioning.

### Key Advantages
- **Performance**: High performance on everything from modern workstations to aging laptops
- **Remote-Friendly**: Work seamlessly over SSH connections, ideal for remote server management
- **Keyboard-Driven**: Drastically reduces the number of commands to type
- **Low Resource**: Minimal memory and CPU overhead
- **Universal Access**: Works in any terminal environment

### Modern Capabilities
- Mouse interaction support (but keyboard should be primary)
- Complex layouts (panels, borders, scrolling regions)
- Real-time data visualization
- Unicode symbols for clarity (✓, ✗, ★, ⚡, etc.)
- ANSI color coding for status indication

---

## Design Patterns from Popular TUIs

### Lazygit (Git Management)

**Design Philosophy:**
- Clear, at-a-glance view of repository status
- Shows branch, commit history, unstaged files, and staged files all in one place
- Makes advanced commands like interactive rebasing more approachable
- UI guides users through complex processes

**Key Features:**
- Panel-based layout (commits, files, branches, stash)
- Context-aware keybindings (same key does different things in different panels)
- Inline help (press ? for context-specific help)
- Visual feedback for all actions
- Undo support where possible

**UX Wins:**
- Reduces cognitive load by showing all relevant info at once
- Makes complex Git operations discoverable
- Keyboard shortcuts that save time compared to CLI

### K9s (Kubernetes Management)

**Design Philosophy:**
- Real-time updates with minimal latency
- Customizable interface (skins, column selection)
- Plugin support for extensibility
- Quick access to common operations

**Key Features:**
- Resource-focused navigation (pods → logs → describe)
- Custom command shortcuts
- Filtering and search within views
- Port-forward, scaling, restart actions in-context

**UX Wins:**
- Eliminates need to remember kubectl commands
- Visual clarity while maintaining terminal efficiency
- Keyboard shortcuts boost productivity

### Common Patterns Across Tools
1. **Panel/Split Layout**: Multiple views visible simultaneously
2. **Context Awareness**: Same key does different things based on focus
3. **Inline Help**: ? key shows help overlay
4. **Status Bar**: Bottom bar shows current mode/shortcuts
5. **Color Coding**: Visual indicators for status (green=good, red=error, yellow=warning)

---

## Navigation Patterns

### Vim-like Keybindings
Many successful TUIs borrow from Vim:
- `h/j/k/l` - Directional navigation (left/down/up/right)
- `gg/G` - Jump to top/bottom
- `/` - Search/filter
- `n/N` - Next/previous search result
- `:` - Command mode
- `Esc` - Cancel/exit mode

### Standard TUI Navigation
- **Tab/Shift+Tab**: Cycle through interactive elements
- **Arrow keys**: Universal navigation (ALWAYS support these!)
- **Enter**: Select/activate/expand
- **Space**: Toggle/select (in lists)
- **Esc**: Cancel/back/close
- **?**: Help
- **q**: Quit
- **Ctrl+C**: Force quit

### History Stack Pattern
Similar to browser back/forward:
- `Alt+Left/Right` or `h/l` in some modes
- Breadcrumbs showing navigation path
- Maintains context when drilling down

### Best Practice
**Always support both arrow keys AND vim-like alternatives.** Users have different preferences, and arrow keys work universally.

---

## Frecency & History Management

### What is Frecency?

Frecency is a score combining **Frequency** (how often) and **Recency** (how recently) an item has been accessed.

Originally developed by Mozilla for Firefox's address bar, now widely used in:
- Telescope.nvim (Neovim file picker)
- Firefox address bar
- Smart file openers

### How Frecency Scoring Works

**Algorithm Overview:**
1. Track each access with a timestamp
2. Calculate age-based score for recent accesses (e.g., last 10 visits)
3. Combine with total access count
4. Newer accesses get higher weight

**Typical Scoring:**
```
Score = (Frequency × 0.5) + (Recency × 0.5)

Recency weights (by age):
- < 1 hour ago:  100 points
- < 1 day ago:   80 points
- < 3 days ago:  60 points
- < 1 week ago:  40 points
- < 1 month ago: 20 points
- Older:         10 points
```

### Implementation for delta-scope

**What to Track:**
1. **Repository Access**: When user views detail view or selects a repo
2. **Filter Queries**: Search terms used (for autocomplete)
3. **Sort Preferences**: Which sort modes are used most
4. **Favorite Toggles**: Track favorite usage patterns

**Database Schema:**
```sql
CREATE TABLE repo_history (
  id INTEGER PRIMARY KEY,
  repo_path TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  action TEXT NOT NULL -- 'view', 'select', 'filter_match'
);

CREATE TABLE search_history (
  id INTEGER PRIMARY KEY,
  query TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  result_count INTEGER,
  selected_repo_path TEXT
);

CREATE INDEX idx_repo_history_path ON repo_history(repo_path);
CREATE INDEX idx_repo_history_time ON repo_history(timestamp);
```

### UX Benefits
- **Faster Access**: Most-used repos appear first
- **Predictive**: Learn user patterns over time
- **Smart Defaults**: Sort by frecency by default
- **Context-Aware**: Recent searches appear in filter autocomplete

---

## Settings & Configuration

### Settings Page Patterns

**Common Approaches:**
1. **Modal Dialog**: Press 'c' or 's' to open settings overlay
2. **Dedicated View**: Settings as a navigable page (like Help view)
3. **Inline Editing**: Edit config file directly in TUI

**Recommended: Dedicated Settings View**
- Consistent with Help view pattern
- Allows for complex settings
- Can show validation/preview
- Easier to navigate than modal

### Settings Organization

**Suggested Sections:**
```
┌─ Settings ─────────────────────────────────┐
│ [General]                                  │
│   Base Paths: ~/projects, ~/git           │
│   Max Depth: 5                             │
│   Show Hidden: No                          │
│                                            │
│ [UI]                                       │
│   Theme: dark                              │
│   Compact Mode: No                         │
│   Default Sort: frecency                   │
│   Show Debug: No                           │
│                                            │
│ [AI Agent]                                 │
│   Enabled: No                              │
│   Provider: anthropic                      │
│   Model: claude-sonnet-3-5                 │
│   API Key: ••••••••                        │
│                                            │
│ [Advanced]                                 │
│   Refresh Interval: 60s                    │
│   Database Location: ~/.local/share/...   │
│                                            │
│ Press 'e' to edit | 'r' to reset | Esc to close
└────────────────────────────────────────────┘
```

### Key Settings Features
- **Live Validation**: Show errors immediately
- **Reset to Defaults**: Easy recovery from misconfig
- **Import/Export**: Share configs between machines
- **Persistence**: Auto-save to `settings.json`
- **Descriptions**: Inline help text for each setting

---

## Visual Design Principles

### Color Coding Standards
Use consistent colors for meaning:
- **Green**: Success, clean, good state
- **Red**: Error, danger, needs attention
- **Yellow**: Warning, uncommitted, pending
- **Cyan**: Information, headers, selected
- **Magenta**: Special, favorite, highlighted
- **Dim/Gray**: Secondary info, hints, disabled

### Unicode Symbols
Enhance clarity with symbols:
- `✓` - Success, completed
- `✗` - Failed, error
- `★` - Favorite, important
- `⚡` - Warning, needs attention
- `→` - Direction, action
- `⏎` - Enter/return
- `▸` - Collapsed/expandable
- `▾` - Expanded
- `•` - Bullet point
- `┌─┐│└┘` - Borders

### Layout Principles
1. **Header**: Show context (app name, stats)
2. **Main Area**: Content with clear focus
3. **Footer**: Keyboard shortcuts for current view
4. **Status Bar**: Current mode, filter, etc.

### Spacing & Clarity
- Use borders to separate sections
- Add padding around dense content
- Align columns for scanability
- Use consistent indentation
- Limit line length for readability

---

## Actionable Recommendations for delta-scope

### Immediate Improvements (Phase 1.5)

#### 1. Add Settings View
```typescript
// New component: SettingsView.tsx
// Keybinding: 'c' for config
// Sections: General, UI, AI, Advanced
// Live save to settings.json
```

**Features:**
- Navigate settings with ↑/↓
- Edit with Enter
- Validation feedback
- Reset to defaults option

#### 2. Implement Frecency Sorting
```typescript
// New sort mode: 'frecency'
// Make it default
// Track repo access in SQLite
// Calculate score based on frequency + recency
```

**Database Schema:**
```sql
CREATE TABLE access_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path TEXT NOT NULL,
  accessed_at INTEGER NOT NULL, -- Unix timestamp
  action TEXT NOT NULL -- 'view', 'select', 'favorite'
);
```

#### 3. Add Search History
```typescript
// Store last 50 filter queries
// Show in dropdown when pressing /
// Pre-fill with most frequent searches
// Clear with Ctrl+U
```

#### 4. Navigation Improvements
- Add breadcrumbs for navigation context
- Show "Back to List" hint in detail view
- Add "Recently Viewed" section in main view
- Support Ctrl+O / Ctrl+I for jump back/forward

#### 5. Status Bar Enhancement
```
┌─ delta-scope v0.2.0 ───── [Filter: "test"] ───── Sort: frecency ───── [157 repos] ─┐
```

### Future Enhancements (Phase 2+)

#### 1. Command Palette (like VSCode)
- `Ctrl+P` or `:` to open
- Fuzzy search for actions
- Show keyboard shortcuts
- Recent commands at top

#### 2. Multi-Select
- `Space` to mark multiple repos
- Bulk actions (favorite, refresh)
- Show count of selected items

#### 3. Workspace Sessions
- Save current view state
- Restore on next launch
- Multiple named sessions

#### 4. Quick Actions Menu
- Right-click or `a` key
- Context menu for current repo
- Git operations (pull, push, commit)
- Open in editor/file manager

---

## Agentic Integration Considerations

### Context Bundle for AI Agent

**What to Provide:**
```json
{
  "settings": {
    "basePaths": ["~/projects"],
    "theme": "dark",
    "ai": {
      "enabled": true,
      "provider": "anthropic"
    }
  },
  "scan_data": {
    "timestamp": "2025-11-10T12:00:00Z",
    "total_repos": 157,
    "repos": [
      {
        "path": "/home/user/projects/delta-scope",
        "status": "uncommitted",
        "branch": "main",
        "uncommitted_files": 3,
        "last_commit": "2025-11-10T10:30:00Z",
        "frecency_score": 95
      }
    ],
    "summary": {
      "needs_attention": 12,
      "clean": 140,
      "favorites": 8
    }
  },
  "user_history": {
    "recent_repos": ["delta-scope", "vibes-director", "DOH"],
    "frequent_actions": ["view_details", "toggle_favorite"],
    "recent_searches": ["docker", "test", "api"]
  }
}
```

### AI Agent Capabilities

**Level 1: Recommendations**
- "You have 3 repos with uncommitted changes for >7 days. Want to review?"
- "Repo 'old-project' hasn't been touched in 6 months. Archive it?"
- "You frequently search for 'docker' - add a custom filter?"

**Level 2: Actions**
- Auto-commit with AI-generated messages
- Batch operations on multiple repos
- Create reports/summaries
- Suggest git workflows

**Level 3: Proactive**
- Monitor for issues (broken remotes, large repos)
- Suggest cleanup operations
- Learn preferences and auto-configure
- Integration with CI/CD

### UI for Agent Interaction
```
┌─ AI Suggestions ───────────────────────────┐
│ 💡 3 repos need attention                  │
│ 💡 Consider archiving 2 old projects       │
│ 💡 Large uncommitted change in repo-x      │
│                                            │
│ Press 'a' to accept | 'd' to dismiss      │
└────────────────────────────────────────────┘
```

---

## References

- Mozilla Frecency Algorithm (Firefox)
- telescope.nvim frecency implementation
- lazygit UI patterns
- k9s design philosophy
- Textual framework documentation
- awesome-tuis GitHub collection

---

## Changelog

- **2025-11-10**: Initial research and documentation
- **Next**: Implement recommendations in phases
