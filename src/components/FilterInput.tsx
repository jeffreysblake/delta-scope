/**
 * Filter input component for fuzzy searching repositories
 */

import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface FilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  matchCount?: number;
  totalCount?: number;
}

export const FilterInput: React.FC<FilterInputProps> = ({
  value,
  onChange,
  onSubmit,
  matchCount,
  totalCount,
}) => {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Box>
        <Text color="cyan" bold>
          Filter:{' '}
        </Text>
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} placeholder="Type to search..." />
      </Box>
      {matchCount !== undefined && totalCount !== undefined && (
        <Box marginTop={0}>
          <Text dimColor>
            Showing {matchCount} of {totalCount} repositories
          </Text>
        </Box>
      )}
    </Box>
  );
};
