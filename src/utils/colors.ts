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

/**
 * Severity levels for count-based coloring
 */
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITY_THRESHOLDS = {
  low: 10,      // < 10 items
  medium: 50,   // 10-50 items
  high: 200,    // 50-200 items
  critical: Infinity, // 200+ items
} as const;

export const SEVERITY_COLORS = {
  low: 'green',
  medium: 'yellow',
  high: 'red',
  critical: 'magenta',
} as const;

/**
 * Navigation indicators
 */
export const NAV_SYMBOLS = {
  expanded: '▼',
  collapsed: '▶',
  selected: '●',
  unselected: '○',
  bullet: '•',
  separator: '│',
  corner: '└',
  branch: '├',
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

/**
 * Get severity level based on count
 */
export function getSeverityLevel(count: number): SeverityLevel {
  if (count < SEVERITY_THRESHOLDS.low) return 'low';
  if (count < SEVERITY_THRESHOLDS.medium) return 'medium';
  if (count < SEVERITY_THRESHOLDS.high) return 'high';
  return 'critical';
}

/**
 * Get color for a count based on severity
 */
export function getSeverityColor(count: number): string {
  const level = getSeverityLevel(count);
  return SEVERITY_COLORS[level];
}

/**
 * Check if severity level should show bold text
 */
export function isSevereBold(count: number): boolean {
  const level = getSeverityLevel(count);
  return level === 'high' || level === 'critical';
}
