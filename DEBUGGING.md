# Debugging delta-scope

## Debug Mode

delta-scope includes a built-in debug mode that displays useful runtime information at the bottom of the TUI.

### Enabling Debug Mode

```bash
DEV=true npm run dev
```

or

```bash
DEV=true delta-scope
```

### Debug Panel Information

When debug mode is enabled, you'll see a yellow-bordered panel at the bottom showing:

- **View**: Current view/route (home, help, settings, etc.)
- **Selected Index**: Currently selected item index
- **Repo Count**: Total repositories loaded
- **Filter Active**: Whether fuzzy filter is active
- **Last Keypress**: The last key you pressed (useful for testing keybindings)
- **Render Time**: How long the last render took (in milliseconds)

## Performance Profiling

### Component Render Times

The debug panel shows render time for the main Dashboard component. If you notice slowness:

1. Enable debug mode
2. Perform actions (navigation, filtering, etc.)
3. Watch the "Render Time" metric
4. Renders should be < 100ms for a good experience

### Slow Repo Scanning

If scanning takes a long time:

1. Check your `maxDepth` setting (in config)
2. Add more patterns to `excludePatterns`
3. Reduce the number of `basePaths`

```bash
# View current config
delta-scope config

# Common performance killers:
# - Scanning home directory (~/)
# - Deep node_modules directories
# - Large build output directories
```

## React DevTools

You can use React DevTools to inspect the component tree:

```bash
# Terminal 1: Start React DevTools
npx react-devtools

# Terminal 2: Run delta-scope in dev mode
DEV=true npm run dev
```

The TUI will connect to DevTools automatically.

## Common Issues

### Config Not Loading

```bash
# Check config location
delta-scope config

# Reset to defaults if corrupted
delta-scope reset-config
```

### Repos Not Found

1. Check that base paths exist and are accessible
2. Verify you have read permissions
3. Check `maxDepth` setting (default: 5)

```bash
# Add a base path manually
delta-scope add-path /path/to/repos
```

### Git Status Errors

If a repo shows as not loaded or errors:

1. Check that `.git` directory exists
2. Ensure git is installed: `git --version`
3. Check repo isn't corrupted: `cd repo && git status`

### Keyboard Shortcuts Not Working

1. Enable debug mode and check "Last Keypress"
2. Your terminal emulator might intercept certain keys
3. Try alternative bindings (e.g., `k/j` instead of arrow keys)

## Logging

### Enable Verbose Logging

Currently, delta-scope doesn't write logs to a file. If you need to debug crashes:

```bash
# Run with Node.js debugging
NODE_OPTIONS='--inspect' DEV=true npm run dev
```

Then open `chrome://inspect` in Chrome to attach the debugger.

## Testing in Development

### Watch Mode

```bash
# Auto-reload on file changes
npm run dev:watch
```

### Test with Different Configs

```bash
# Use a custom config file (feature not yet implemented)
# Coming in Phase 2
```

### Simulate Large Repos

To test performance with many repos:

1. Create a test directory with many git repos:
```bash
mkdir -p /tmp/test-repos
cd /tmp/test-repos
for i in {1..100}; do
  mkdir "repo-$i"
  cd "repo-$i"
  git init
  echo "test" > README.md
  git add .
  git commit -m "Initial commit"
  cd ..
done
```

2. Add to delta-scope:
```bash
delta-scope add-path /tmp/test-repos
```

## Debugging Tests

### Run Single Test File

```bash
npm test src/components/__tests__/Header.test.tsx
```

### Run Tests with UI

```bash
npm run test:ui
```

This opens a web interface where you can:
- Run individual tests
- See detailed output
- Filter by test name
- View coverage

### Debug Test Failures

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run with detailed error output
npm test -- --reporter=verbose --no-coverage
```

## Memory Leaks

If delta-scope uses increasing memory over time:

1. Exit and restart the app
2. Check for recursive scanning (misconfigured `excludePatterns`)
3. File an issue with steps to reproduce

## Getting Help

If you're stuck:

1. Check existing issues: https://github.com/jeffreysblake/delta-scope/issues
2. Enable debug mode and capture screenshots
3. Run `delta-scope config` and share (redact sensitive paths)
4. Share your terminal emulator and OS version

## Useful Development Commands

```bash
# Full check before committing
npm run type-check && npm run lint && npm test

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Clean build
rm -rf dist && npm run build
```
