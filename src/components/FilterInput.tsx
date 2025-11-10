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
  suggestions?: string[];
}

export const FilterInput: React.FC<FilterInputProps> = ({
  value,
  onChange,
  onSubmit,
  matchCount,
  totalCount,
  suggestions = [],
}) => {
  // Filter suggestions based on current value
  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    .slice(0, 5); // Show max 5 suggestions

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
      {value && filteredSuggestions.length > 0 && (
        <Box marginTop={0} flexDirection="column">
          <Text dimColor>Recent searches:</Text>
          {filteredSuggestions.map((suggestion, idx) => (
            <Box key={idx} marginLeft={2}>
              <Text dimColor color="yellow">
                ‣ {suggestion}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
