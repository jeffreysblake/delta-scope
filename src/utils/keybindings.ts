/**
 * Centralized keyboard shortcuts configuration
 */

export const KEYBINDINGS = {
  // Navigation
  quit: 'q',
  up: 'upArrow',
  down: 'downArrow',
  expand: 'return', // Enter key

  // Actions
  filter: '/',
  sort: 's',
  favorite: 'f',
  detail: 'd',
  refresh: 'r',

  // Views
  help: '?',
  settings: 'c', // 'c' for config
  home: 'h',

  // Modifiers
  escape: 'escape',
  tab: 'tab',
} as const;

export const HELP_TEXT = `
Keyboard Shortcuts:
  ↑/↓ or k/j     Navigate repos
  Enter          Expand/collapse group, or show repo details
  /              Filter repos (fuzzy search)
  Escape         Clear filter, or return from views
  d              Show repo details
  f              Toggle favorite (star)
  s              Cycle sort modes (status → name → recent → changes → frecency)
  r              Refresh all repos
  i              AI Insights (agent recommendations)
  h              Home view (return from detail)
  c              Settings (view configuration)
  ?              Show this help
  q              Quit

Frecency: A smart sorting algorithm that considers both frequency and recency
          of your interactions with repositories.

AI Agent: When enabled, the AI agent analyzes your repositories and provides
          intelligent recommendations for cleanup, workflow optimization, and
          health improvements. Configure in Settings (c).
`;
