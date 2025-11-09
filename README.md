# delta-scope

**Power-user TUI for managing chaos across multiple git repositories**

`delta-scope` (or `ds` for short) is a terminal-based UI that helps developers who work on many projects simultaneously. It provides a real-time, color-coded overview of all your git repositories, making it easy to spot uncommitted changes, unpushed commits, and repos that need attention.

## Features

- 🔍 **Auto-discovery**: Scans configured directories for all git repositories
- 🎨 **Color-coded status**: Instantly see which repos need attention
- ⚡ **Fast navigation**: Keyboard-driven interface for power users
- ⭐ **Favorites**: Mark frequently-used repos for quick access
- 📊 **Grouped view**: Repos organized by status (clean, uncommitted, unpushed, etc.)
- 🔄 **Live refresh**: Update status on demand
- 🎯 **Fuzzy filter**: Quickly find repos by name (coming soon)
- 📈 **Sort modes**: Sort by name, status, recent activity, or change volume

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

# View configuration
delta-scope config

# Reset to defaults
delta-scope reset-config
```

## Configuration

Configuration is stored in `~/.config/delta-scope/config.json` (or OS-specific config directory).

Default configuration:
```json
{
  "basePaths": ["~/projects", "~/git"],
  "excludePatterns": ["node_modules", "dist", "build", ".venv", "target"],
  "theme": "dark",
  "refreshInterval": 60,
  "favorites": [],
  "maxDepth": 5,
  "showHidden": false
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑/↓` or `k/j` | Navigate repos |
| `Enter` | Expand/collapse group |
| `/` | Filter repos (fuzzy search) |
| `s` | Cycle sort modes |
| `f` | Toggle favorite |
| `d` | Show repo details |
| `r` | Refresh all repos |
| `h` | Home view |
| `?` | Show help |
| `c` | Settings |
| `q` | Quit |

## Status Colors

- ✓ **Green (Clean)**: All changes committed and pushed
- ⚠ **Yellow (Uncommitted)**: Local changes not committed
- ⬆ **Blue (Unpushed)**: Commits not pushed to remote
- ⚡ **Red (Both)**: Uncommitted changes AND unpushed commits

## Development

```bash
# Install dependencies
npm install

# Run in dev mode with debug panel
npm run dev

# Run in watch mode (auto-reload)
npm run dev:watch

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## Testing

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## Debugging

See [DEBUGGING.md](./DEBUGGING.md) for debugging tips and development tools.

## Architecture

```
delta-scope/
├── src/
│   ├── cli.tsx                 # Entry point
│   ├── app.tsx                 # Main app component
│   ├── components/             # React/Ink components
│   │   ├── Dashboard.tsx       # Main router
│   │   ├── Header.tsx          # Header with stats
│   │   ├── Footer.tsx          # Keyboard shortcuts
│   │   ├── RepoList.tsx        # Grouped repo list
│   │   ├── RepoItem.tsx        # Individual repo
│   │   ├── StatusBadge.tsx     # Status indicator
│   │   ├── HelpView.tsx        # Help screen
│   │   └── DebugPanel.tsx      # Debug info (dev mode)
│   ├── services/               # Business logic
│   │   ├── gitScanner.ts       # Find repos
│   │   ├── gitStatus.ts        # Get repo status
│   │   └── configManager.ts    # Config handling
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utilities
│       ├── colors.ts           # Color scheme
│       └── keybindings.ts      # Keyboard shortcuts
└── tests/                      # Test files
```

## Inspiration

This project was inspired by:
- **DOH (Delta-Oriented Historykeeper)**: Background monitoring and config patterns
- **dust**: Color-coded, hierarchical TUI design
- **vibes-director**: Ink TUI component structure and testing patterns

## Roadmap

### Phase 1 (Current - MVP)
- [x] Basic TUI with repo scanning
- [x] Status grouping and display
- [x] Keyboard navigation
- [x] Debug mode
- [ ] Fuzzy filtering
- [ ] Detail view

### Phase 2
- [ ] Favorites management
- [ ] History tracking (learn from user behavior)
- [ ] Quick actions on repos
- [ ] Desktop notifications

### Phase 3
- [ ] Background monitoring
- [ ] Auto-refresh
- [ ] Git operations (commit, push, pull)
- [ ] Integration with issue trackers

## License

MIT

## Contributing

Contributions welcome! This is a learning project, so don't hesitate to suggest improvements or ask questions.
