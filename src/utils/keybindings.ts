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
  Escape         Clear filter, or return from detail view
  d              Show repo details
  s              Cycle sort modes (name → status → recent → changes)
  f              Toggle favorite (coming soon)
  r              Refresh all repos
  h              Home view (return from detail)
  ?              Show this help
  c              Settings (coming soon)
  q              Quit
`;
