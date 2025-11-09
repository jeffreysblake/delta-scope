/**
 * Status badge component - displays color-coded status with symbol
 */

import React from 'react';
import { Text } from 'ink';
import type { RepoStatus } from '../types/index.js';
import { getStatusColor, getStatusSymbol, getStatusLabel } from '../utils/colors.js';

interface StatusBadgeProps {
  status: RepoStatus;
  showLabel?: boolean;
  count?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showLabel = false,
  count,
}) => {
  const color = getStatusColor(status);
  const symbol = getStatusSymbol(status);
  const label = getStatusLabel(status);

  if (showLabel) {
    return (
      <Text color={color}>
        {symbol} {label}
        {count !== undefined && ` (${count} repos)`}
      </Text>
    );
  }

  return <Text color={color}>{symbol}</Text>;
};
