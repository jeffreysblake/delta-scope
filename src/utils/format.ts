/**
 * Formatting utilities for TUI display
 */

import path from 'path';

/**
 * Truncate a file path to fit within maxWidth
 * Preserves repo name (last segment) and first parent
 * Example: /media/decisiv/models/tooling/spiders/hrequests
 *       -> /media/.../spiders/hrequests
 */
export function truncatePath(filePath: string, maxWidth: number): string {
  if (filePath.length <= maxWidth) {
    return filePath;
  }

  const parts = filePath.split(path.sep).filter(Boolean);
  if (parts.length <= 2) {
    return filePath.slice(0, maxWidth - 3) + '...';
  }

  // Always keep: first segment, last two segments
  const first = parts[0];
  const lastTwo = parts.slice(-2);
  const ellipsis = '...';

  // Start with minimum: /first/.../parent/name
  const minPath = path.sep + [first, ellipsis, ...lastTwo].join(path.sep);

  if (minPath.length >= maxWidth) {
    // Even minimum is too long, just truncate the end
    return filePath.slice(0, maxWidth - 3) + '...';
  }

  // Try to include more middle segments
  const middle = parts.slice(1, -2);
  let result = minPath;

  for (let i = middle.length - 1; i >= 0; i--) {
    const segment = middle[i];
    const testPath = path.sep + [first, ellipsis, segment, ...lastTwo].join(path.sep);
    if (testPath.length <= maxWidth) {
      result = path.sep + [first, ellipsis, ...middle.slice(i), ...lastTwo].join(path.sep);
      break;
    }
  }

  return result;
}

/**
 * Format a number with comma separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a relative time string
 * Examples: "2 mins ago", "3 days ago", "1 month ago"
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return 'never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffWeeks < 4) return `${diffWeeks} wk${diffWeeks === 1 ? '' : 's'} ago`;
  if (diffMonths < 12) return `${diffMonths} mo${diffMonths === 1 ? '' : 's'} ago`;
  return `${diffYears} yr${diffYears === 1 ? '' : 's'} ago`;
}

/**
 * Format a count with compact notation for large numbers
 * Examples: 10, 150, 1.5K, 25K
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 10000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num < 1000000) return Math.round(num / 1000) + 'K';
  return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
}

/**
 * Pad a string to a fixed width (left or right aligned)
 */
export function padString(str: string, width: number, align: 'left' | 'right' = 'left'): string {
  if (str.length >= width) return str.slice(0, width);
  const padding = ' '.repeat(width - str.length);
  return align === 'left' ? str + padding : padding + str;
}

/**
 * Create a visual progress bar
 * Example: [████████░░] 80%
 */
export function progressBar(ratio: number, width: number = 10): string {
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Create a diff bar showing additions vs deletions
 * Example: ▓▓▓▓░░ (+40 -20)
 */
export function diffBar(added: number, deleted: number, width: number = 6): string {
  const total = added + deleted;
  if (total === 0) return '─'.repeat(width);

  const addWidth = Math.round((added / total) * width);
  const delWidth = width - addWidth;

  return '▓'.repeat(addWidth) + '░'.repeat(delWidth);
}
