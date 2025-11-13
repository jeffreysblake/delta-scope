# Delta-Scope User Guide

Complete guide to using delta-scope for managing multiple git repositories.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Navigation](#basic-navigation)
3. [Working with Repositories](#working-with-repositories)
4. [Using the AI Agent](#using-the-ai-agent)
5. [Configuration](#configuration)
6. [Advanced Features](#advanced-features)
7. [Tips & Best Practices](#tips--best-practices)

## Getting Started

### Initial Setup

When you first run delta-scope:

```bash
delta-scope
```

You'll see a mostly empty interface. This is normal! You need to configure your repository paths first.

**Quick Setup Steps:**
1. Press `c` to open Settings
2. Note the "Base Paths" section showing `[]` (empty)
3. Press `Esc` to close settings
4. Edit the config file manually:
   ```bash
   # Create config directory if it doesn't exist
   mkdir -p ~/.config/delta-scope

   # Edit with your favorite editor
   nano ~/.config/delta-scope/settings.json
   ```
5. Add your repository paths:
   ```json
   {
     "basePaths": ["/home/user/projects", "/home/user/work"],
     "excludePatterns": ["node_modules", "dist", "build"],
     "maxDepth": 5
   }
   ```
6. Save and restart delta-scope

### Understanding the Interface

```
┌─ Delta-Scope ────────────────────────────────┐
│ 🎯 Repos: 15  ✓ 8  ⚠ 3  ⬆ 2  ⚡ 2  Sort: status │  ← Header
├──────────────────────────────────────────────┤
│ ● Clean (8) [expanded]                        │  ← Group Header
│   ✓ my-project                   main    0    │  ← Repo Item
│   ✓ another-repo                 main    0    │
│ ● Uncommitted (3) [collapsed]                 │
│ ● Unpushed (2) [collapsed]                    │
│ ● Both (2) [collapsed]                        │
├──────────────────────────────────────────────┤
│ ↑/↓:Navigate  Enter:Expand  /:Filter  q:Quit │  ← Footer
└──────────────────────────────────────────────┘
```

**Interface Elements:**
- **Header**: Shows total repos, counts by status, current sort mode, AI status
- **Groups**: Repos organized by status (clean, uncommitted, unpushed, both)
- **Repo Items**: Individual repositories with name, branch, and change count
- **Footer**: Context-sensitive keyboard shortcuts

## Basic Navigation

### Moving Around

**In the main view:**
- `↑` / `k` - Move up
- `↓` / `j` - Move down
- `Enter` - Expand/collapse groups, or view repo details
- `Esc` - Go back / close dialogs
- `h` - Return to home view from anywhere

**Scrolling:**
- The list auto-scrolls to keep the selected item visible
- Groups expand/collapse to show/hide repos

### Keyboard Shortcuts Quick Reference

**Main View:**
- `/` - Open filter (fuzzy search)
- `s` - Cycle sort modes
- `f` - Toggle favorite on selected repo
- `d` - View repo details
- `r` - Refresh all repositories
- `i` - Open AI agent view
- `c` - Open settings
- `?` - Show help
- `q` - Quit

## Working with Repositories

### Viewing Repository Status

**Status Indicators:**
- `✓` **Green** - Clean (all committed and pushed)
- `⚠` **Yellow** - Uncommitted changes
- `⬆` **Blue** - Unpushed commits
- `⚡` **Red** - Both uncommitted changes and unpushed commits

**Example:**
```
✓ my-clean-repo              main    0    ← All good
⚠ needs-commit               dev     5    ← 5 uncommitted files
⬆ needs-push                 main    ↑3   ← 3 commits to push
⚡ messy-repo                 feat    8 ↑2 ← 8 files, 2 commits
```

### Repository Details

Press `d` or `Enter` on a repo to see full details:

```
┌─ Repository Details ─────────────────────────┐
│                                              │
│ 📁 my-project                                │
│ /home/user/projects/my-project               │
│                                              │
│ Branch: main                                 │
│ Status: Uncommitted changes                  │
│                                              │
│ Changes:                                     │
│   Modified: 3 files                          │
│   Untracked: 2 files                         │
│   Staged: 0 files                            │
│                                              │
│ Commits:                                     │
│   Ahead: 0                                   │
│   Behind: 0                                  │
│                                              │
│ Remotes:                                     │
│   origin: git@github.com:user/my-project.git │
│                                              │
│ Last Commit:                                 │
│   feat: add new feature                      │
│   2025-01-13 14:30:00                        │
│                                              │
└──────────────────────────────────────────────┘
```

**In detail view:**
- `Esc` or `h` - Return to main view
- Scroll to see all information

### Filtering Repositories

Press `/` to open the filter:

```
┌─ Filter ─────────────────────────────────────┐
│ > my-pr_                                     │  ← Your input
│                                              │
│ Matching: 3 repos                            │
│   my-project                                 │
│   my-project-2                               │
│   my-prototype                               │
└──────────────────────────────────────────────┘
```

**Features:**
- **Fuzzy matching**: `mypr` matches "my-project"
- **Path matching**: Searches both name and path
- **Auto-complete**: Shows matching repos as you type
- **Press `Esc`** to clear filter and return

### Sorting Repositories

Press `s` to cycle through sort modes:

1. **Status** (default) - Groups by status, then alphabetical
2. **Name** - Alphabetical order
3. **Recent** - Most recently modified first
4. **Changes** - Most changes first
5. **Frecency** - Most frequently/recently accessed first

**Frecency Sorting:**
Delta-scope learns which repos you use most and surfaces them. Based on Mozilla's frecency algorithm:
- Recent access → higher score
- Frequent access → higher score
- Decays over time

### Favorites

Mark frequently-used repos for quick access:

**Toggle favorite:**
- Select a repo
- Press `f`
- ⭐ appears next to favorited repos

**Benefits:**
- Favorites always appear at the top of sorts
- Tracked in config (persists across sessions)
- Can filter to show only favorites (coming soon)

### Refreshing Status

**Automatic refresh:**
- Repos auto-refresh based on `refreshInterval` (default: 60 seconds)

**Manual refresh:**
- Press `r` to refresh all repos immediately
- Useful after making changes outside delta-scope

**Per-repo refresh:**
- Navigate to a repo
- Press `Enter` to view details (triggers refresh for that repo)

## Using the AI Agent

The AI agent analyzes all your repositories and provides intelligent recommendations.

### First-Time AI Setup

**Prerequisites:**
Choose one:
- **Local model** (free): Install ollama or lm-studio
- **Anthropic Claude** (paid): Get API key
- **OpenAI** (paid): Get API key

See [README.md](./README.md#ai-agent-setup) for detailed setup instructions.

### Triggering Analysis

Press `i` to open the AI agent view.

**If AI is not enabled:**
```
┌─ AI Agent ───────────────────────────────────┐
│                                              │
│ AI Agent is not enabled                      │
│                                              │
│ Press 'c' to configure AI settings           │
│                                              │
└──────────────────────────────────────────────┘
```

**If AI is enabled:**
```
┌─ AI Agent ───────────────────────────────────┐
│                                              │
│ 🤖 Analyzing 15 repositories...              │
│                                              │
│ ⣾ Loading...                                 │
│                                              │
└──────────────────────────────────────────────┘
```

Analysis takes 5-30 seconds depending on:
- Number of repositories
- AI provider speed
- Network latency (for cloud providers)

### Understanding Recommendations

After analysis, you'll see recommendations:

```
┌─ AI Agent ───────────────────────────────────┐
│ Recommendations (3)                          │
│                                              │
│ ► Health Alert - 3 repos with old changes    │
│   Priority: high                             │
│   Affects: my-project, old-work, prototype   │
│   Actions: [View] [Commit All]               │
│                                              │
│ ○ Workflow Pattern - Related repos           │
│   Priority: medium                           │
│   Affects: frontend, backend, shared         │
│   Actions: [Group View]                      │
│                                              │
│ ○ Cleanup Suggestion - Stale repos           │
│   Priority: low                              │
│   Affects: archive-me, old-experiment        │
│   Actions: [Archive]                         │
│                                              │
│ Insights:                                    │
│ • You work on frontend/backend together 80%  │
│ • 2 repos have no commits in 6 months        │
│ • Peak coding time: 2-5 PM                   │
│                                              │
│ Analysis completed in 12.3s                  │
└──────────────────────────────────────────────┘
```

**Recommendation Types:**
- **Health Alert** - Repos needing attention
- **Workflow Pattern** - Repos you work on together
- **Cleanup Suggestion** - Repos to archive/delete
- **Optimization** - Suggestions to improve workflow

**Priority Levels:**
- 🔴 **High** - Immediate attention needed
- 🟡 **Medium** - Worth addressing soon
- 🟢 **Low** - Nice to have

### Interacting with Recommendations

**Navigate:**
- `↑/↓` or `k/j` - Move between recommendations
- `Enter` or `Space` - Expand/collapse details

**Actions:**
- `x` - Dismiss recommendation (won't show again)
- `e` - Execute first action
- Individual action keys shown in brackets

**Example interaction:**
```
1. Press `i` to open AI agent
2. Wait for analysis
3. Press `↓` to select first recommendation
4. Press `Enter` to expand details
5. Read the explanation and affected repos
6. Press `e` to execute the suggested action
7. Confirm if it's a dangerous action
8. Press `Esc` to return to main view
```

### Safe vs. Dangerous Actions

**Safe actions** (execute immediately):
- View repository details
- Apply filters
- Change sort mode
- Refresh repositories
- Navigate to repos

**Dangerous actions** (require confirmation):
- Commit changes
- Push to remote
- Stash work
- Delete/archive repos

**Example confirmation dialog:**
```
┌─ Confirm Action ─────────────────────────────┐
│                                              │
│ ⚠️  This action is potentially dangerous     │
│                                              │
│ Action: Commit changes                       │
│ Repos: my-project, another-repo (2 total)    │
│                                              │
│ Message: "WIP: Save current progress"        │
│                                              │
│ This will commit all changes in 2 repos.     │
│ Rollback: Use git reset to undo              │
│                                              │
│ Press 'y' to confirm, 'n' to cancel          │
└──────────────────────────────────────────────┘
```

### Dismissing Recommendations

If a recommendation isn't useful:

1. Select the recommendation
2. Press `x` to dismiss
3. It won't show up in future analyses

**Dismissed recommendations persist** across sessions (stored in database).

### Auto-Analyze Mode

**Enable in Settings** (`c` then `a`):
```json
{
  "ai": {
    "autoAnalyze": true
  }
}
```

**Behavior:**
- Analysis runs automatically every refresh
- New recommendations appear in header
- Badge shows count: "AI: 3 new"
- Press `i` to view recommendations

**When to use:**
- Working on many repos actively
- Want proactive suggestions
- Don't mind AI costs

**When to disable:**
- Want to trigger manually
- Minimize AI costs
- Slower machine/network

## Configuration

### Accessing Settings

Press `c` to open settings view.

### Settings Reference

**Repository Scanning:**

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| Max Depth | `d` | 5 | How deep to search for repos |
| Show Hidden | `h` | false | Include hidden directories (.foo) |

**Display:**

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| Theme | `t` | dark | UI color scheme |
| Refresh Interval | `i` | 60000 | Auto-refresh delay (ms) |

**AI Configuration:**

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| Enabled | `e` | false | Turn AI on/off |
| Provider | `p` | local | anthropic/openai/local |
| Model | `m` | varies | Model name |
| API Key | `k` | - | Your API key |
| Endpoint | `u` | varies | API endpoint URL |
| Auto-Analyze | `a` | false | Run AI on every refresh |
| Max Recommendations | `n` | 10 | Limit results |
| Timeout | `o` | 30000 | Request timeout (ms) |

### Config File Location

**Linux/macOS:**
```
~/.config/delta-scope/settings.json
```

**Windows:**
```
%APPDATA%\delta-scope\settings.json
```

### Example Configurations

**Minimal (no AI):**
```json
{
  "basePaths": ["/home/user/projects"],
  "excludePatterns": ["node_modules"],
  "maxDepth": 3
}
```

**Power User (with AI):**
```json
{
  "basePaths": [
    "/home/user/work",
    "/home/user/personal",
    "/home/user/experiments"
  ],
  "excludePatterns": [
    "node_modules",
    "dist",
    "build",
    ".venv",
    "target",
    "vendor"
  ],
  "theme": "dark",
  "refreshInterval": 30000,
  "favorites": [
    "/home/user/work/main-project",
    "/home/user/work/api"
  ],
  "maxDepth": 5,
  "showHidden": false,
  "ai": {
    "enabled": true,
    "provider": "local",
    "model": "qwen2.5-coder:7b",
    "endpoint": "http://localhost:11434/v1",
    "apiKey": "not-needed",
    "timeout": 45000,
    "maxRetries": 3,
    "autoAnalyze": false,
    "maxRecommendations": 15
  }
}
```

## Advanced Features

### Frecency Tracking

Delta-scope tracks how often and recently you access repos.

**How it works:**
1. Every time you view a repo, it's recorded
2. Recent access gets higher weight
3. Frequent access accumulates score
4. Old access decays over time

**Use cases:**
- Sort by frecency to see your active repos first
- AI uses frecency to understand your workflow
- Favorites can be auto-suggested based on frecency (future)

**Data stored in:**
```
~/.local/share/delta-scope/delta-scope.db
```

### Search History

Filter autocomplete learns from your searches.

**How it works:**
1. Every filter query is saved
2. Frequent searches appear first
3. Shows result counts
4. Cleaned up after 90 days

**Privacy:**
- Stored locally only
- No network transmission
- Can be cleared by deleting database

### Database Management

**Location:**
- Linux/macOS: `~/.local/share/delta-scope/delta-scope.db`
- Windows: `%APPDATA%\delta-scope\delta-scope.db`

**Tables:**
- `access_history` - Repository access tracking
- `search_history` - Search autocomplete
- `context_snapshots` - AI analysis cache
- `dismissed_recommendations` - User preferences
- `schema_version` - Migration tracking

**Reset database:**
```bash
rm ~/.local/share/delta-scope/delta-scope.db
delta-scope  # Will recreate with fresh schema
```

### Performance Optimization

**For large repository collections (100+):**

1. **Increase refresh interval:**
   ```json
   {"refreshInterval": 120000}  // 2 minutes
   ```

2. **Reduce max depth:**
   ```json
   {"maxDepth": 3}
   ```

3. **Add exclude patterns:**
   ```json
   {
     "excludePatterns": [
       "node_modules", "dist", "build", ".venv",
       "target", "vendor", ".git", ".cache"
     ]
   }
   ```

4. **Disable auto-analyze:**
   ```json
   {"ai": {"autoAnalyze": false}}
   ```

5. **Consider splitting base paths:**
   - Instead of scanning `/home/user` (1000+ repos)
   - Scan specific directories: `/home/user/active`, `/home/user/work`

## Tips & Best Practices

### Daily Workflow

**Morning routine:**
1. Start delta-scope: `ds`
2. Press `r` to refresh all repos
3. Check status groups for uncommitted/unpushed work
4. Press `i` to run AI analysis
5. Review recommendations, execute actions

**During work:**
- Keep delta-scope running in a terminal
- Use `Cmd/Alt+Tab` to switch to it
- Quick check: Status counts in header
- Toggle favorites with `f` on active repos

**End of day:**
1. Press `r` to refresh
2. Check for uncommitted changes (yellow ⚠)
3. Use AI to suggest cleanup actions
4. Commit or stash work-in-progress

### Repository Organization

**Best practices:**
- Group related repos in same directory
  ```
  ~/work/
    ├── frontend/
    ├── backend/
    └── shared/
  ```
- Use consistent naming conventions
- Keep personal/work repos separate
- Archive old repos to different location

**AI benefits from organization:**
- Detects workflow patterns better
- More accurate related-repo suggestions
- Better health monitoring

### Working with Multiple Teams

**Separate base paths:**
```json
{
  "basePaths": [
    "/home/user/team-a",
    "/home/user/team-b",
    "/home/user/personal"
  ]
}
```

**Use filter to focus:**
- Press `/` then type "team-a" to see only those repos
- Sort by frecency to see active projects first

**AI advantages:**
- Detects cross-team patterns
- Suggests cleanup by team
- Monitors health across all teams

### AI Cost Management

**For cloud providers (Anthropic/OpenAI):**

**Minimize costs:**
1. Disable auto-analyze: `{"autoAnalyze": false}`
2. Trigger manually when needed (press `i`)
3. Reduce max recommendations: `{"maxRecommendations": 5}`
4. Use cheaper models:
   - OpenAI: `gpt-4o-mini` instead of `gpt-4o`
   - Anthropic: `claude-haiku` instead of `claude-sonnet-4-5`

**Estimated costs (100 repos):**
- GPT-4o: ~$0.10 per analysis
- GPT-4o-mini: ~$0.02 per analysis
- Claude Sonnet: ~$0.15 per analysis
- Claude Haiku: ~$0.03 per analysis
- Local (ollama/lm-studio): $0.00

**For heavy usage:**
- Use local models (free, unlimited)
- One-time cost: hardware to run models
- Models like qwen2.5-coder:7b work well on modern laptops

### Keyboard Efficiency

**Vim-style navigation:**
- Use `j/k` instead of arrows (faster, no hand movement)
- Press `h` to return home from anywhere

**Common patterns:**
1. Quick filter: `/` → type → `Esc`
2. View details: `d` → read → `Esc`
3. AI check: `i` → review → `x` to dismiss or `e` to execute

**Pro tips:**
- Learn one new shortcut per day
- Create muscle memory for frequent actions
- Use `?` to remind yourself of shortcuts

### Integration with Other Tools

**VS Code:**
```bash
# Open repo in VS Code from detail view
# (Copy path, then)
code /path/to/repo
```

**Git CLI:**
```bash
# Delta-scope shows status, use git for operations
cd $(delta-scope --print-path repo-name)  # future feature
git commit -am "message"
```

**Scripts:**
```bash
# Export repo list
delta-scope --export-json > repos.json  # future feature

# Batch operations
cat repos.json | jq -r '.[] | select(.status=="uncommitted") | .path' | \
  xargs -I {} git -C {} commit -am "WIP"
```

### Troubleshooting Common Issues

**See [README.md Troubleshooting](./README.md#troubleshooting)** for detailed solutions.

**Quick fixes:**
- Repos not found? Check base paths in config
- AI not working? Verify provider is running
- Slow performance? Reduce maxDepth or add excludePatterns
- Config issues? Delete and recreate: `rm ~/.config/delta-scope/settings.json`

## Getting Help

- **Documentation**: See [README.md](./README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Issues**: [GitHub Issues](https://github.com/jeffreysblake/delta-scope/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jeffreysblake/delta-scope/discussions)

## Appendix: All Keyboard Shortcuts

### Main View
| Key | Action |
|-----|--------|
| `↑` or `k` | Navigate up |
| `↓` or `j` | Navigate down |
| `Enter` | Expand/collapse group or view details |
| `/` | Open filter (fuzzy search) |
| `s` | Cycle sort modes |
| `f` | Toggle favorite |
| `d` | Show repository details |
| `r` | Refresh all repositories |
| `i` | Open AI agent view |
| `c` | Open settings |
| `h` | Return to home view |
| `?` | Show help |
| `q` | Quit application |

### Detail View
| Key | Action |
|-----|--------|
| `Esc` | Return to main view |
| `h` | Return to home view |

### AI Agent View
| Key | Action |
|-----|--------|
| `↑` or `k` | Navigate up |
| `↓` or `j` | Navigate down |
| `Enter` or `Space` | Expand/collapse details |
| `x` | Dismiss recommendation |
| `e` | Execute first action |
| `Esc` or `i` | Return to main view |

### Settings View
| Key | Action |
|-----|--------|
| `d` | Edit max depth |
| `i` | Edit refresh interval |
| `h` | Toggle show hidden |
| `t` | Toggle theme |
| `e` | Toggle AI enabled |
| `p` | Cycle AI provider |
| `k` | Edit API key |
| `m` | Edit model name |
| `u` | Edit endpoint |
| `a` | Toggle auto-analyze |
| `n` | Edit max recommendations |
| `o` | Edit timeout |
| `Esc` or `c` | Close settings |

### Filter View
| Key | Action |
|-----|--------|
| `Esc` | Clear filter and close |
| Type | Filter repos (fuzzy matching) |
