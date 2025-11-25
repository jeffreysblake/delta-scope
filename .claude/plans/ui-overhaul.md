# Comprehensive UI Overhaul Plan

## Overview

Transform delta-scope's TUI from functional to polished, addressing visual appeal, information density, navigation, and responsive behavior.

---

## Phase 1: Visual Polish

### 1.1 Enhanced Color Scheme
**File: `src/utils/colors.ts`**
- Add severity-based colors (repo with 3000 uncommitted files vs 10)
- Add gradient color functions for intensity-based coloring
- Add theme support (light/dark)

```typescript
// New additions to colors.ts
export const SEVERITY_COLORS = {
  low: 'green',      // < 10 items
  medium: 'yellow',  // 10-50 items
  high: 'red',       // 50-200 items
  critical: 'magenta', // 200+ items (bold+blink?)
};

export function getSeverityColor(count: number): string;
export function formatWithSeverity(count: number, text: string): JSX.Element;
```

### 1.2 Path Truncation Utility
**File: `src/utils/format.ts` (new)**
- Smart path truncation with ellipsis
- Preserve important parts (repo name, first parent)
- Terminal-width aware

```typescript
// Example: /media/decisiv/models/tooling/spiders/hrequests
// Truncated: /media/.../spiders/hrequests (fit to width)
export function truncatePath(path: string, maxWidth: number): string;
export function formatRepoPath(path: string, termWidth: number): string;
```

### 1.3 Better Visual Hierarchy in RepoItem
**File: `src/components/RepoItem.tsx`**
- Use box-drawing characters for structure
- Color-code uncommitted file counts by severity
- Add visual separators between repos
- Show relative time for last commit

### 1.4 Group Headers Redesign
**File: `src/components/RepoList.tsx`**
- More prominent group headers with full-width background
- Show summary stats inline (total files, total commits)
- Visual collapse/expand indicators (▶/▼)

---

## Phase 2: Information Density

### 2.1 Compact Mode Toggle
**File: `src/components/Dashboard.tsx`, `src/types/index.ts`**
- Add `displayMode: 'compact' | 'detailed' | 'minimal'`
- Keyboard shortcut: `v` to cycle modes
- Persist in config

### 2.2 Enhanced Repo Metadata
**File: `src/services/gitStatus.ts`, `src/types/index.ts`**
- Add `lastCommitAge` (relative: "2 days ago")
- Add `repoSize` (optional, on-demand)
- Add `remoteUrl` for quick context

### 2.3 Smart Summary Row
**File: `src/components/RepoList.tsx`**
- Show at top of each group:
  - Total uncommitted files across all repos
  - Total unpushed commits
  - Repos with most activity

### 2.4 Inline Status Indicators
- Show mini progress bars or sparklines for activity
- Visual diff indicator (green/red bar proportional to +/-)

---

## Phase 3: Navigation Improvements

### 3.1 Scroll Position Indicator
**File: `src/components/RepoList.tsx`**
- Show "[5/144]" or scroll percentage
- Visual scrollbar on right edge (optional)

### 3.2 Page Navigation
**File: `src/hooks/useKeyboardHandler.ts`**
- `Page Up/Down` for jumping 10 items
- `Home/End` for first/last
- `g` + number for jump to group

### 3.3 Group Quick Actions
- `[` / `]` to jump between groups
- `e` expand all / `E` collapse all
- Number keys 1-4 to jump to status groups

### 3.4 Search Improvements
**File: `src/components/FilterInput.tsx`**
- Highlight matching text in results
- Show match count per group
- Fuzzy match indicators

---

## Phase 4: Responsive Layout

### 4.1 Terminal Width Detection
**File: `src/hooks/useTerminalSize.ts` (new)**
- Hook to get and track terminal dimensions
- Debounced resize handling
- Width breakpoints (narrow <80, medium 80-120, wide 120+)

### 4.2 Adaptive Layouts
**File: `src/components/Dashboard.tsx`, all components**
- Narrow mode: Single column, minimal info
- Medium mode: Current layout
- Wide mode: Split view (list + details side by side)

### 4.3 Responsive Header/Footer
**File: `src/components/Header.tsx`, `src/components/Footer.tsx`**
- Truncate footer shortcuts on narrow terminals
- Show abbreviated shortcuts (↑↓ not "↑/↓: Navigate")
- Priority-based shortcut display

### 4.4 Virtualized List (Performance)
- Only render visible items
- Smooth scrolling for large lists (100+ repos)

---

## Implementation Order

### Sprint 1: Foundation (Visual Polish Core)
1. [ ] Create `src/utils/format.ts` with truncation utilities
2. [ ] Enhance `src/utils/colors.ts` with severity colors
3. [ ] Update `RepoItem.tsx` with severity coloring
4. [ ] Add visual separators between repos

### Sprint 2: Navigation
5. [ ] Create `src/hooks/useTerminalSize.ts`
6. [ ] Add scroll position indicator
7. [ ] Implement Page Up/Down, Home/End
8. [ ] Add group jumping ([ and ])

### Sprint 3: Information Density
9. [ ] Add display mode toggle (compact/detailed)
10. [ ] Add lastCommitAge to repo metadata
11. [ ] Implement smart summary rows
12. [ ] Add highlight matching in filter

### Sprint 4: Responsive
13. [ ] Implement width breakpoints
14. [ ] Create adaptive layouts
15. [ ] Responsive Header/Footer
16. [ ] (Optional) Virtualized list

---

## File Changes Summary

### New Files
- `src/utils/format.ts` - Path truncation, number formatting
- `src/hooks/useTerminalSize.ts` - Terminal dimension hook

### Modified Files
- `src/utils/colors.ts` - Add severity colors
- `src/components/RepoItem.tsx` - Visual overhaul
- `src/components/RepoList.tsx` - Group headers, scroll indicator
- `src/components/Header.tsx` - Responsive adjustments
- `src/components/Footer.tsx` - Responsive shortcuts
- `src/components/Dashboard.tsx` - Display modes, responsive
- `src/components/FilterInput.tsx` - Match highlighting
- `src/hooks/useKeyboardHandler.ts` - New navigation keys
- `src/types/index.ts` - New config options
- `src/services/gitStatus.ts` - lastCommitAge

---

## Estimated Scope

- ~15-20 files modified
- ~300-500 lines new code
- Tests updated for each component
- Should maintain <600 lines per file

---

## Questions to Resolve

1. **Theme preference**: Dark-only or add light theme option?
2. **Virtualization**: Worth the complexity for typical repo counts?
3. **Split view**: Useful for wide terminals, or keep simple?
4. **Sparklines/graphs**: Worth the visual complexity?
