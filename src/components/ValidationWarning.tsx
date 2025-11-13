/**
 * ValidationWarning component
 * Displays configuration validation warnings and errors
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ValidationIssue } from '../services/configValidator.js';

interface ValidationWarningProps {
  issues: ValidationIssue[];
}

export const ValidationWarning: React.FC<ValidationWarningProps> = ({ issues }) => {
  const errors = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');
  const infos = issues.filter((i) => i.type === 'info');

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">
          ⚠️  Configuration Issues Detected
        </Text>
      </Box>

      {errors.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="red">
            Errors ({errors.length}):
          </Text>
          {errors.map((issue, idx) => (
            <Box key={idx} flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color="red">❌ {issue.message}</Text>
              {issue.suggestion && (
                <Text dimColor>   💡 {issue.suggestion}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {warnings.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="yellow">
            Warnings ({warnings.length}):
          </Text>
          {warnings.map((issue, idx) => (
            <Box key={idx} flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color="yellow">⚠️  {issue.message}</Text>
              {issue.suggestion && (
                <Text dimColor>   💡 {issue.suggestion}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {infos.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            Suggestions ({infos.length}):
          </Text>
          {infos.map((issue, idx) => (
            <Box key={idx} flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color="cyan">ℹ️  {issue.message}</Text>
              {issue.suggestion && (
                <Text dimColor>   💡 {issue.suggestion}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text dimColor>
          Press any key to continue{errors.length > 0 ? ' (errors must be fixed first)' : ''}
        </Text>
      </Box>
    </Box>
  );
};
