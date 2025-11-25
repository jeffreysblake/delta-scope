/**
 * Confirmation dialog component for dangerous actions
 */

import React from 'react';
import { Box, Text, useInput, useStdout, type Key } from 'ink';

export interface ConfirmationDialogProps {
  title: string;
  message: string;
  warnings?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  title,
  message,
  warnings = [],
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const dialogWidth = Math.min(60, terminalWidth - 4); // Max 60, but respect terminal width

  useInput((input: string, key: Key) => {
    if (input === 'y' || key.return) {
      onConfirm();
    } else if (input === 'n' || key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      padding={1}
      width={dialogWidth}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="yellow">
          ⚠️  {title}
        </Text>
      </Box>

      {/* Message */}
      <Box marginBottom={1}>
        <Text>{message}</Text>
      </Box>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="red">
            Warnings:
          </Text>
          {warnings.map((warning, idx) => (
            <Text key={idx} color="red">
              • {warning}
            </Text>
          ))}
        </Box>
      )}

      {/* Actions */}
      <Box marginTop={1} justifyContent="space-between">
        <Text>
          <Text bold color="green">
            y
          </Text>
          <Text dimColor> / </Text>
          <Text bold color="green">
            Enter
          </Text>
          <Text dimColor>: {confirmLabel}</Text>
        </Text>
        <Text>
          <Text bold color="red">
            n
          </Text>
          <Text dimColor> / </Text>
          <Text bold color="red">
            Esc
          </Text>
          <Text dimColor>: {cancelLabel}</Text>
        </Text>
      </Box>
    </Box>
  );
};
