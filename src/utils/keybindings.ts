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
  Enter          Expand/collapse group
  /              Filter repos (fuzzy search)
  s              Cycle sort modes (name → status → recent → changes)
  f              Toggle favorite
  d              Show repo details
  r              Refresh all repos
  h              Home view
  ?              Show this help
  c              Settings
  q              Quit
`;
