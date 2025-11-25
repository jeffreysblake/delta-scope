# TUI/Ink Expert Skill

You are an expert in terminal user interfaces (TUI), specifically React-based TUIs using Ink.

## When This Skill Activates

- Editing files in `src/components/`
- Working with Ink components (Box, Text, etc.)
- Debugging rendering issues
- Implementing keyboard handlers
- Terminal layout problems

## Core Knowledge

### Ink Component Model

```tsx
// Box is the fundamental layout primitive
<Box flexDirection="column" width="100%" height="100%">
  <Box borderStyle="single" paddingX={1}>
    <Text>Content</Text>
  </Box>
</Box>
```

**Key Props:**
- `flexDirection`: 'row' | 'column' (default: row)
- `width/height`: number | string ('100%', '50%')
- `borderStyle`: 'single' | 'double' | 'round' | 'bold' | 'classic'
- `padding/paddingX/paddingY`: number
- `justifyContent`: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
- `alignItems`: 'flex-start' | 'center' | 'flex-end' | 'stretch'

### Common Rendering Issues

1. **Ghost frames on startup**: Terminal dimensions not stable during first renders
   - Fix: Clear screen before render (`\x1b[2J`)
   - Fix: Add loading state before full UI

2. **Flickering**: Too many rapid re-renders
   - Fix: Batch state updates
   - Fix: Use `useMemo` for expensive computations
   - Fix: Debounce rapid updates

3. **Layout overflow**: Content taller than terminal
   - Ink can't rerender content above viewport
   - Fix: Use `<Static>` for logs that scroll up
   - Fix: Implement virtual scrolling for long lists

4. **Border/box rendering artifacts**:
   - Ensure consistent width across nested boxes
   - Use `width="100%"` carefully - can cause issues

### Keyboard Handling Best Practices

```tsx
import { useInput } from 'ink';

useInput((input, key) => {
  if (key.escape) { /* handle escape */ }
  if (key.return) { /* handle enter */ }
  if (key.upArrow) { /* handle up */ }
  if (key.downArrow) { /* handle down */ }
  if (input === 'q') { /* handle q key */ }
});
```

**Key object properties:**
- `key.return`, `key.escape`, `key.tab`
- `key.upArrow`, `key.downArrow`, `key.leftArrow`, `key.rightArrow`
- `key.pageUp`, `key.pageDown`, `key.home`, `key.end`
- `key.ctrl`, `key.shift`, `key.meta`

### Testing Ink Components

```tsx
import { render } from 'ink-testing-library';

const { lastFrame, stdin } = render(<MyComponent />);

// Check rendered output
expect(lastFrame()).toContain('Expected text');

// Simulate keyboard input
stdin.write('q'); // Single key
stdin.write('\x1B[A'); // Up arrow (escape sequence)
stdin.write('\r'); // Enter

// Wait for async updates
await vi.waitFor(() => {
  expect(lastFrame()).toContain('Updated');
});
```

### Performance Tips

1. **Avoid unnecessary re-renders:**
   ```tsx
   const MemoizedComponent = React.memo(MyComponent);
   ```

2. **Use callbacks properly:**
   ```tsx
   const handleAction = useCallback(() => {
     // action
   }, [/* deps */]);
   ```

3. **Batch state updates:**
   ```tsx
   // Bad: Multiple re-renders
   setA(1);
   setB(2);

   // Good: Single re-render (React 18+)
   // React automatically batches these
   ```

4. **Use Static for streaming content:**
   ```tsx
   import { Static } from 'ink';

   <Static items={logs}>
     {(log, index) => <Text key={index}>{log}</Text>}
   </Static>
   ```

### Alternate Screen Buffer

For full-screen TUIs, use alternate screen buffer:

```tsx
// Enter alternate screen
process.stdout.write('\x1b[?1049h');
process.stdout.write('\x1b[2J'); // Clear
process.stdout.write('\x1b[H');  // Home

// Exit alternate screen (cleanup)
process.stdout.write('\x1b[?1049l');
```

### Color and Styling

```tsx
<Text color="green">Green text</Text>
<Text color="#ff0000">Hex color</Text>
<Text color="rgb(255,0,0)">RGB color</Text>
<Text bold>Bold</Text>
<Text italic>Italic</Text>
<Text underline>Underline</Text>
<Text dimColor>Dimmed</Text>
<Text backgroundColor="blue">Background</Text>
```

## Debugging Checklist

When TUI issues occur:

1. [ ] Check terminal dimensions: `process.stdout.columns`, `process.stdout.rows`
2. [ ] Verify Box dimensions don't exceed terminal
3. [ ] Check for rapid state changes causing re-renders
4. [ ] Ensure cleanup on unmount (intervals, listeners)
5. [ ] Test in different terminal emulators
6. [ ] Check if issue is specific to certain terminal sizes

## Project-Specific Patterns

This project (delta-scope) uses:
- `useKeyboardHandler` hook for centralized keyboard handling
- Groups pattern for collapsible repo lists
- Header/Footer/Content layout structure
- ErrorBoundary for graceful error handling
