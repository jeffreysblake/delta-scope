# delta-scope

**AI-Powered TUI for managing multiple git repositories**

`delta-scope` (or `ds` for short) is a terminal-based UI that helps developers manage many projects simultaneously. It provides a real-time, color-coded overview of all your git repositories with **AI-powered recommendations** to keep your workflow organized and efficient.

## ✨ Features

### Repository Management
- 🔍 **Auto-discovery**: Scans configured directories for all git repositories
- 🎨 **Color-coded status**: Instantly see which repos need attention
- ⚡ **Fast navigation**: Keyboard-driven interface for power users
- 📊 **Grouped view**: Repos organized by status (clean, uncommitted, unpushed, both)
- 🔄 **Live refresh**: Update status on demand
- 📈 **Multiple sort modes**: Sort by name, status, recent activity, changes, or frecency

### Smart Features
- ⭐ **Favorites**: Mark frequently-used repos for quick access
- 🔎 **Fuzzy filter**: Quickly find repos by name with autocomplete
- 📝 **Detail view**: Full repository information including branches, commits, remotes
- 🎯 **Frecency sorting**: Mozilla-style algorithm learns your most-used repos
- 💾 **SQLite persistence**: History tracking and search autocomplete

### 🤖 AI Agent
- **Intelligent recommendations**: AI analyzes all repos and suggests actions
- **Interactive execution**: Dismiss or execute recommendations with confirmation
- **Safety controls**: Automatic validation for dangerous operations
- **Multiple providers**: Works with Anthropic Claude, OpenAI, or local models (lm-studio/ollama)
- **Contextual insights**: Learns your workflow patterns and repository health
- **Pattern detection**: Discovers sequential, concurrent, and temporal workflow patterns
- **Anomaly detection**: Identifies stale repos, unusual changes, broken remotes, and more
- **Health scoring**: Tracks repository health trends over time

### 🚀 Background Agent & Scheduling
- **Background daemon**: Run tasks in the background without blocking the UI
- **Scheduled tasks**: Hourly, daily, or weekly automated tasks
- **Triggered actions**: Execute actions on repo discovery, scan complete, launch, or idle
- **Recommendation queue**: Queue and manage AI recommendations for later

### 🔌 External Integrations
- **GitHub/GitLab**: View PRs, MRs, and CI/CD status directly in delta-scope
- **Slack/Discord**: Send scan summaries and AI recommendations to your team
- **VS Code**: Open repos or workspaces in VS Code with one command
- **tmux**: Launch terminal sessions for repos with automatic session management

## Requirements

- **Node.js** 18+
- **find** and **sed** - Standard Unix utilities (pre-installed on most systems)

## Installation

```bash
npm install -g delta-scope
# or
pnpm add -g delta-scope
```

## Quick Start

### First-time Setup

```bash
# 1. Start delta-scope (will create config on first run)
delta-scope
# or use the short alias
ds

# 2. Press 'c' to open Settings
# 3. The app will guide you through initial configuration
```

### Adding Repository Paths

**Option 1: Via Settings UI (Recommended)**
1. Press `c` to open Settings
2. Current base paths are shown at the top
3. Edit `~/.config/delta-scope/settings.json` manually to add paths

**Option 2: Via Command Line**
```bash
delta-scope add-path ~/projects
delta-scope add-path ~/work
```

**Option 3: Edit Config File**
Edit `~/.config/delta-scope/settings.json`:
```json
{
  "basePaths": ["/home/user/projects", "/home/user/work"]
}
```

## Configuration

Configuration is stored in `~/.config/delta-scope/settings.json`.

### Example Configuration
```json
{
  "basePaths": ["~/projects", "~/git"],
  "excludePatterns": ["node_modules", "dist", "build", ".venv", "target"],
  "theme": "dark",
  "refreshInterval": 60,
  "favorites": [],
  "maxDepth": 5,
  "showHidden": false,
  "ai": {
    "enabled": false,
    "provider": "local",
    "model": "qwen2.5-coder:7b",
    "endpoint": "http://localhost:11434/v1",
    "apiKey": "not-needed",
    "timeout": 30000,
    "maxRetries": 3,
    "autoAnalyze": false,
    "maxRecommendations": 10
  }
}
```

## AI Agent Setup

The AI agent is **optional** but provides intelligent recommendations. Choose one of these options:

### Option 1: Local Models (Free, Private, Recommended)

**Using lm-studio:**
```bash
# 1. Download lm-studio from https://lmstudio.ai/
# 2. Load a code model (recommended: qwen2.5-coder, deepseek-coder)
# 3. Click "Start Server" (default: http://localhost:1234/v1)
# 4. Note the model name shown in lm-studio
```

**Using ollama:**
```bash
# 1. Install ollama from https://ollama.ai/
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Pull a code model (recommended)
ollama pull qwen2.5-coder:7b
# Alternative models:
# ollama pull deepseek-coder:6.7b
# ollama pull codellama:13b

# 3. Ollama server starts automatically at http://localhost:11434/v1
```

**Configure delta-scope for local models:**
1. Start `delta-scope` and press `c` for Settings
2. Press `e` to **enable AI**
3. Press `p` to cycle provider to **"local"**
4. Press `m` to set **model name**:
   - For ollama: `qwen2.5-coder:7b` (or your model)
   - For lm-studio: Copy exact name from lm-studio UI
5. Press `u` to set **endpoint**:
   - For ollama: `http://localhost:11434/v1`
   - For lm-studio: `http://localhost:1234/v1`
6. Press `k` to set API key: `not-needed`
7. Press `a` to toggle **auto-analyze** (optional, uses AI automatically)
8. Press `Esc` to save and exit settings

### Option 2: Anthropic Claude (Best Quality, Paid)

**Setup:**
1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Start `delta-scope` and press `c` for Settings
3. Press `e` to **enable AI**
4. Press `p` to cycle provider to **"anthropic"**
5. Press `k` to enter your **API key** (starts with `sk-ant-`)
6. Press `m` to set **model**: `claude-sonnet-4-5` (recommended)
   - Alternatives: `claude-3-5-sonnet-20241022`, `claude-opus-4-0`
7. Press `Esc` to save

**Recommended for:**
- Best code analysis quality
- Most accurate recommendations
- Complex multi-repo workflows

**Cost:** ~$3 per 1M input tokens, $15 per 1M output tokens

### Option 3: OpenAI (Good Balance, Paid)

**Setup:**
1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Start `delta-scope` and press `c` for Settings
3. Press `e` to **enable AI**
4. Press `p` to cycle provider to **"openai"**
5. Press `k` to enter your **API key** (starts with `sk-`)
6. Press `m` to set **model**: `gpt-4o` (recommended)
   - Alternatives: `gpt-4-turbo`, `gpt-4o-mini` (cheaper)
7. Press `u` to set **endpoint** (optional): `https://api.openai.com/v1`
8. Press `Esc` to save

**Recommended for:**
- Good quality at lower cost than Claude
- Faster responses
- Existing OpenAI users

**Cost:** $2.50 per 1M input tokens, $10 per 1M output tokens (gpt-4o)

## External Integrations Setup

Integrations are stored in `~/.config/delta-scope/integrations.json`.

### GitHub/GitLab
Requires [GitHub CLI](https://cli.github.com/) (`gh`) or [GitLab CLI](https://gitlab.com/gitlab-org/cli) (`glab`):
```json
{
  "github": {
    "enabled": true,
    "token": "your_github_token_optional"
  },
  "gitlab": {
    "enabled": true,
    "token": "your_gitlab_token_optional",
    "base_url": "https://gitlab.com"
  }
}
```

### Slack/Discord Notifications
Get webhook URLs from your Slack/Discord settings:
```json
{
  "slack": {
    "enabled": true,
    "webhook_url": "https://hooks.slack.com/services/...",
    "notify_on_scan": true,
    "notify_on_recommendations": true
  },
  "discord": {
    "enabled": true,
    "webhook_url": "https://discord.com/api/webhooks/...",
    "notify_on_scan": true,
    "notify_on_recommendations": true
  }
}
```

### VS Code Integration
```json
{
  "vscode": {
    "enabled": true,
    "executable_path": "code"
  }
}
```

### tmux Integration
```json
{
  "tmux": {
    "enabled": true,
    "session_prefix": "delta-scope"
  }
}
```

## Keyboard Shortcuts

### Main View
| Key | Action |
|-----|--------|
| `↑/↓` or `k/j` | Navigate repos/groups |
| `Enter` | Expand/collapse group or view repo details |
| `/` | Filter repos (fuzzy search with autocomplete) |
| `s` | Cycle sort modes (status, name, recent, changes, frecency) |
| `f` | Toggle favorite |
| `d` | Show repo details |
| `r` | Refresh all repos |
| `i` | AI Insights (trigger analysis) |
| `c` | Settings |
| `h` | Home view |
| `?` | Show help |
| `q` | Quit |

### AI Agent View
| Key | Action |
|-----|--------|
| `↑/↓` or `k/j` | Navigate recommendations |
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
| `u` | Edit endpoint (OpenAI/local only) |
| `a` | Toggle auto-analyze |
| `n` | Edit max recommendations |
| `o` | Edit timeout |
| `Esc` or `c` | Close settings |

## Status Colors

- ✓ **Green (Clean)**: All changes committed and pushed
- ⚠ **Yellow (Uncommitted)**: Local changes not committed
- ⬆ **Blue (Unpushed)**: Commits not pushed to remote
- ⚡ **Red (Both)**: Uncommitted changes AND unpushed commits

## AI Recommendations

The AI agent analyzes your repositories and provides recommendations like:
- **Health**: "3 repos have uncommitted changes over 7 days old"
- **Workflow**: "These 5 repos are often worked on together"
- **Cleanup**: "2 repos have no activity in 6 months - archive?"
- **Actions**: Direct executable actions with safety validation

**Safe actions** (execute immediately):
- View repo details
- Apply filters
- Change sort mode
- Refresh repositories
- Run analysis

**Dangerous actions** (require confirmation):
- Commit changes
- Push to remote
- Stash work
- Delete files

## Troubleshooting

### No Repositories Found

**Problem:** Delta-scope shows "No repositories found"

**Solutions:**
1. Check your base paths in Settings (`c` key)
2. Ensure paths contain git repositories (folders with `.git`)
3. Check `maxDepth` setting - increase if repos are nested deeply
4. Verify paths exist and you have read permissions

```bash
# Verify your config
cat ~/.config/delta-scope/settings.json

# Check if git repos exist
find ~/projects -name ".git" -type d | head -10
```

### AI Connection Errors

**Problem:** "Failed to connect to AI provider" or timeout errors

**For Local Models (ollama/lm-studio):**
```bash
# Check if server is running
curl http://localhost:11434/v1/models  # ollama
curl http://localhost:1234/v1/models   # lm-studio

# Restart ollama if needed
ollama serve

# Check lm-studio server is started in the UI
```

**For Cloud Providers (Anthropic/OpenAI):**
1. Verify API key is correct (press `c` then `k`)
2. Check internet connection
3. Verify API key has credits/quota
4. Try increasing timeout in Settings (`o` key, default: 30000ms)

### Slow Performance

**Problem:** UI feels sluggish or unresponsive

**Solutions:**
1. **Too many repos:** Increase `refreshInterval` (default 60s)
2. **Deep scanning:** Reduce `maxDepth` in Settings (try 3-5)
3. **AI overhead:** Disable `autoAnalyze`, trigger AI manually with `i`
4. **Exclude patterns:** Add folders to `excludePatterns`:
   ```json
   "excludePatterns": ["node_modules", "dist", "build", ".venv", "target", "vendor"]
   ```

### Config Issues

**Problem:** Settings not saving or corrupted config

**Reset to defaults:**
```bash
# Backup current config
cp ~/.config/delta-scope/settings.json ~/delta-scope-backup.json

# Remove config (will be recreated with defaults)
rm ~/.config/delta-scope/settings.json

# Start delta-scope
delta-scope
```

### Database Issues

**Problem:** Errors related to SQLite or database

**Reset database:**
```bash
# Backup database (optional)
cp ~/.local/share/delta-scope/delta-scope.db ~/delta-scope-db-backup.db

# Remove database (will be recreated)
rm ~/.local/share/delta-scope/delta-scope.db

# Start delta-scope
delta-scope
```

### Git Operation Failures

**Problem:** Actions like commit/push/stash fail

**Common causes:**
1. **No git configured:**
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
2. **Permission issues:** Check SSH keys for remote operations
3. **Detached HEAD:** Repository may be in detached HEAD state
4. **Merge conflicts:** Resolve conflicts manually first

### Getting Help

**Enable debug mode:**
```bash
# Run with debug panel (shows logs and errors)
npm run dev  # if running from source

# Check logs
delta-scope --verbose  # if available
```

**Report issues:**
- GitHub Issues: [github.com/jeffreysblake/delta-scope/issues](https://github.com/jeffreysblake/delta-scope/issues)
- Include: OS version, delta-scope version, error messages, config (without API keys)

## Development

```bash
# Install dependencies
npm install

# Run in dev mode with debug panel
npm run dev

# Run tests
npm test

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

## Architecture

```
delta-scope/
├── src/
│   ├── cli.tsx                 # Entry point
│   ├── app.tsx                 # Main app component
│   ├── components/             # React/Ink components
│   │   ├── Dashboard.tsx       # Main router & state manager
│   │   ├── Header.tsx          # Header with stats & AI status
│   │   ├── Footer.tsx          # Keyboard shortcuts
│   │   ├── RepoList.tsx        # Grouped repo list
│   │   ├── RepoItem.tsx        # Individual repo display
│   │   ├── DetailView.tsx      # Repository details
│   │   ├── SettingsView.tsx    # Configuration UI
│   │   ├── AgentView.tsx       # AI recommendations
│   │   ├── ConfirmationDialog.tsx  # Unsafe action confirmation
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── gitScanner.ts       # Find repositories
│   │   ├── gitStatus.ts        # Get repo status
│   │   ├── configManager.ts    # Configuration
│   │   ├── database.ts         # SQLite persistence (schema v5)
│   │   ├── aiAgent.ts          # AI service (Anthropic/OpenAI/local)
│   │   ├── agentContext.ts     # Context builder for AI
│   │   ├── prompts.ts          # AI prompt templates
│   │   ├── patternDetection.ts # Workflow pattern detection
│   │   ├── actionExecutor.ts   # Agent action execution
│   │   ├── monitoring.ts       # Proactive monitoring & alerts
│   │   ├── predictive.ts       # Predictive features
│   │   ├── scheduler.ts        # Background daemon & scheduling
│   │   └── integrations.ts     # External tool integrations
│   ├── types/                  # TypeScript types
│   │   ├── index.ts            # Core types
│   │   └── agent.ts            # AI agent types
│   └── utils/                  # Utilities
│       ├── colors.ts           # Color scheme
│       └── keybindings.ts      # Keyboard shortcuts
└── tests/                      # Test files (281 tests)
    ├── __tests__/              # Integration tests
    ├── components/__tests__/   # Component tests
    ├── services/__tests__/     # Service tests
    └── utils/__tests__/        # Utility tests
```

## Technology Stack

- **UI**: [Ink 4](https://github.com/vadimdemedes/ink) - React for CLIs
- **AI**: [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript), [OpenAI SDK](https://github.com/openai/openai-node)
- **Database**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **Git**: Simple-git (for operations) + native git CLI
- **Testing**: Vitest + ink-testing-library (281 tests, 100% passing)
- **Language**: TypeScript (strict mode)

## Roadmap

See [ROADMAP.md](./ROADMAP.md) and [AGENTIC_ROADMAP.md](./AGENTIC_ROADMAP.md) for detailed future plans.

### Completed ✅
- ✅ Phase 1: MVP (repo scanning, status display, navigation, filtering)
- ✅ Phase 2: SQLite persistence (frecency, search history, favorites)
- ✅ Phase 3: AI Agent foundation (Anthropic/OpenAI/local support)
- ✅ Phase 3.5: Agent actions (dismiss, execute with safety checks)
- ✅ Phase 4: Enhanced intelligence (pattern detection, anomaly detection, health scoring, learning)
- ✅ Phase 5 (Weeks 1-2): Agent actions (safe actions, git operations, comprehensive safety validation)
- ✅ Phase 5 (Week 3): Background agent & scheduling (daemon, scheduled tasks, triggered actions, recommendation queue)
- ✅ Phase 6 (Weeks 1-2): Proactive intelligence (monitoring, alerts, predictive features)
- ✅ Phase 6 (Week 3): External integrations (GitHub/GitLab, Slack/Discord, VS Code, tmux)

All planned phases complete! 🎉

## Database

Delta-scope uses SQLite for persistence:
- **Location**: `~/.local/share/delta-scope/delta-scope.db` (Linux/macOS)
- **Schema**: Version 5 (automatic migrations)
- **Tables**:
  - `access_history`: Frecency tracking
  - `search_history`: Search autocomplete
  - `context_snapshots`: AI analysis history
  - `dismissed_recommendations`: User preferences
  - `workflow_patterns`: Detected workflow patterns (Phase 4)
  - `recommendation_feedback`: Learning from user responses (Phase 4)
  - `anomalies`: Detected repository anomalies (Phase 4)
  - `repo_health_history`: Health score tracking over time (Phase 4)
  - `action_log`: Audit trail of agent actions (Phase 4/5)
  - `scheduled_tasks`: Background scheduled tasks (Phase 5 Week 3)
  - `triggered_actions`: Event-driven actions (Phase 5 Week 3)
  - `queued_recommendations`: Recommendation queue (Phase 5 Week 3)
  - `task_executions`: Task execution history (Phase 5 Week 3)
- **Cleanup**: Auto-cleanup of data older than 90 days

## Testing

See [TESTING.md](./TESTING.md) for detailed testing documentation.

**Current stats:** 281 tests, 100% passing
- **Unit tests:** 268 tests (services, components, utilities)
- **Integration tests:** 13 tests (workflow and system integration)

## Contributing

Contributions welcome! This project demonstrates:
- Modern TUI development with Ink
- AI integration patterns (multi-provider)
- SQLite for local-first applications
- Testing terminal UIs
- TypeScript best practices

## License

MIT

## Credits

Inspired by:
- **DOH (Delta-Oriented Historykeeper)**: Background monitoring patterns
- **dust**: Color-coded hierarchical TUI design
- **vibes-director**: Ink component structure

Built with ❤️ by Jeffrey Blake with assistance from Claude (Anthropic).
