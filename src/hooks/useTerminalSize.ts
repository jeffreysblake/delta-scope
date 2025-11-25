/**
 * Custom hook to get and track terminal dimensions
 * Provides responsive breakpoints for adaptive UI rendering
 */

import { useStdout } from 'ink';
import { useMemo } from 'react';

export interface TerminalSize {
  width: number;
  height: number;
  isNarrow: boolean;
  isMedium: boolean;
  isWide: boolean;
}

/**
 * Hook to get terminal dimensions with responsive breakpoints
 * @returns Terminal size information with breakpoint flags
 *
 * Breakpoints:
 * - narrow: < 80 columns (mobile/small terminal)
 * - medium: 80-120 columns (standard terminal)
 * - wide: > 120 columns (large terminal/widescreen)
 */
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();

  return useMemo(() => {
    const width = stdout?.columns || 80;
    const height = stdout?.rows || 24;

    return {
      width,
      height,
      isNarrow: width < 80,
      isMedium: width >= 80 && width <= 120,
      isWide: width > 120,
    };
  }, [stdout?.columns, stdout?.rows]);
}
