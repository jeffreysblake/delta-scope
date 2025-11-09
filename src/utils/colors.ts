/**
 * Color scheme for delta-scope
 * Using chalk-compatible color names
 */

import type { RepoStatus } from '../types/index.js';

export const COLORS = {
  // Status colors (inspired by dust's color coding)
  clean: 'green',
  uncommitted: 'yellow',
  unpushed: 'blue',
  both: 'red',

  // UI elements
  border: 'cyan',
  header: 'magenta',
  text: 'white',
  dimmed: 'gray',
  highlight: 'cyan',
  error: 'red',
  warning: 'yellow',
  success: 'green',

  // Favorites
  favorite: 'magenta',
} as const;

export const STATUS_SYMBOLS = {
  clean: '✓',
  uncommitted: '⚠',
  unpushed: '⬆',
  both: '⚡',
} as const;

export const STATUS_LABELS = {
  clean: 'All Clean',
  uncommitted: 'Uncommitted Changes',
  unpushed: 'Unpushed Commits',
  both: 'Uncommitted + Unpushed',
} as const;

export function getStatusColor(status: RepoStatus): string {
  return COLORS[status];
}

export function getStatusSymbol(status: RepoStatus): string {
  return STATUS_SYMBOLS[status];
}

export function getStatusLabel(status: RepoStatus): string {
  return STATUS_LABELS[status];
}
