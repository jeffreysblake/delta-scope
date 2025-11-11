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

### 🤖 AI Agent (NEW!)
- **Intelligent recommendations**: AI analyzes all repos and suggests actions
- **Interactive execution**: Dismiss or execute recommendations with confirmation
- **Safety controls**: Automatic validation for dangerous operations
- **Multiple providers**: Works with Anthropic Claude, OpenAI, or local models (lm-studio/ollama)
- **Contextual insights**: Learns your workflow patterns and repository health

## Installation

```bash
npm install -g delta-scope
# or
pnpm add -g delta-scope
```

## Quick Start

```bash
# Start the TUI
delta-scope
# or use the short alias
ds

# Configure base paths to scan
delta-scope add-path ~/projects
delta-scope add-path ~/work
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

### Option 1: Local Models (Free, Private)

**Using lm-studio:**
```bash
# 1. Download and run lm-studio
# 2. Load a model (e.g., qwen2.5-coder, deepseek-coder, codellama)
# 3. Start the server (default: http://localhost:1234/v1)
```

**Using ollama:**
```bash
# 1. Install ollama
# 2. Pull a model
ollama pull qwen2.5-coder:7b

# 3. Ollama runs at http://localhost:11434/v1
```

**Configure in delta-scope:**
- Press `c` to open Settings
- Press `e` to enable AI
- Press `p` to cycle to "local"
- Press `m` to set model name (e.g., "qwen2.5-coder:7b")
- Press `u` to set endpoint (e.g., "http://localhost:11434/v1")
- Press `k` to set API key (use "not-needed" for local models)
- Press `a` to toggle auto-analyze (optional)

### Option 2: Anthropic Claude
```bash
# Get API key from https://console.anthropic.com/
```

Configure:
- Provider: `anthropic`
- Model: `claude-sonnet-4-5`
- API Key: Your Anthropic API key

### Option 3: OpenAI
```bash
# Get API key from https://platform.openai.com/
```

Configure:
- Provider: `openai`
- Model: `gpt-4o` or `gpt-4-turbo`
- API Key: Your OpenAI API key

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
│   │   ├── database.ts         # SQLite persistence
│   │   ├── aiAgent.ts          # AI service (Anthropic/OpenAI/local)
│   │   ├── agentContext.ts     # Context builder for AI
│   │   └── prompts.ts          # AI prompt templates
│   ├── types/                  # TypeScript types
│   │   ├── index.ts            # Core types
│   │   └── agent.ts            # AI agent types
│   └── utils/                  # Utilities
│       ├── colors.ts           # Color scheme
│       └── keybindings.ts      # Keyboard shortcuts
└── tests/                      # Test files (196 tests)
```

## Technology Stack

- **UI**: [Ink 4](https://github.com/vadimdemedes/ink) - React for CLIs
- **AI**: [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript), [OpenAI SDK](https://github.com/openai/openai-node)
- **Database**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **Git**: Simple-git (for operations) + native git CLI
- **Testing**: Vitest + ink-testing-library (196 tests, 100% passing)
- **Language**: TypeScript (strict mode)

## Roadmap

See [ROADMAP.md](./ROADMAP.md) and [AGENTIC_ROADMAP.md](./AGENTIC_ROADMAP.md) for detailed future plans.

### Completed ✅
- ✅ Phase 1: MVP (repo scanning, status display, navigation, filtering)
- ✅ Phase 2: SQLite persistence (frecency, search history, favorites)
- ✅ Phase 3: AI Agent foundation (Anthropic/OpenAI/local support)
- ✅ Phase 3.5: Agent actions (dismiss, execute with safety checks)

### Coming Soon
- 🚧 Phase 4: Enhanced intelligence (pattern detection, learning)
- 🚧 Phase 5: Advanced actions (git operations, batch processing)
- 🚧 Phase 6: Proactive monitoring (alerts, predictions)

## Database

Delta-scope uses SQLite for persistence:
- **Location**: `~/.local/share/delta-scope/delta-scope.db` (Linux/macOS)
- **Schema**: Version 3 (automatic migrations)
- **Tables**:
  - `access_history`: Frecency tracking
  - `search_history`: Search autocomplete
  - `context_snapshots`: AI analysis history
  - `dismissed_recommendations`: User preferences
- **Cleanup**: Auto-cleanup of data older than 90 days

## Testing

See [TESTING.md](./TESTING.md) for detailed testing documentation.

**Current stats:** 196 tests, 100% passing

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
