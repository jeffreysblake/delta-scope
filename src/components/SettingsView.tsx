/**
 * Settings view component - displays and edits configuration
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { AppConfig } from '../types/index.js';

interface SettingsViewProps {
  config: AppConfig;
  onConfigChange?: (config: Partial<AppConfig>) => void;
}

type EditableField = 'maxDepth' | 'refreshInterval' | 'showHidden' | 'theme' | null;

export const SettingsView: React.FC<SettingsViewProps> = ({ config, onConfigChange }) => {
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [tempValue, setTempValue] = useState<string>('');

  /**
   * Start editing a field
   */
  const startEdit = useCallback((field: EditableField) => {
    if (!field) return;

    setEditingField(field);
    // Set initial value
    if (field === 'maxDepth') {
      setTempValue(config.maxDepth.toString());
    } else if (field === 'refreshInterval') {
      setTempValue(config.refreshInterval.toString());
    }
  }, [config]);

  /**
   * Cancel editing
   */
  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setTempValue('');
  }, []);

  /**
   * Save edited value
   */
  const saveEdit = useCallback(() => {
    if (!editingField || !onConfigChange) {
      cancelEdit();
      return;
    }

    try {
      if (editingField === 'maxDepth') {
        const value = parseInt(tempValue, 10);
        if (isNaN(value) || value < 1 || value > 10) {
          // Invalid, cancel
          cancelEdit();
          return;
        }
        onConfigChange({ maxDepth: value });
      } else if (editingField === 'refreshInterval') {
        const value = parseInt(tempValue, 10);
        if (isNaN(value) || value < 10) {
          // Invalid, cancel
          cancelEdit();
          return;
        }
        onConfigChange({ refreshInterval: value });
      }

      cancelEdit();
    } catch {
      cancelEdit();
    }
  }, [editingField, tempValue, onConfigChange, cancelEdit]);

  /**
   * Toggle boolean or cyclic values
   */
  const toggleValue = useCallback((field: EditableField) => {
    if (!onConfigChange) return;

    if (field === 'showHidden') {
      onConfigChange({ showHidden: !config.showHidden });
    } else if (field === 'theme') {
      onConfigChange({ theme: config.theme === 'dark' ? 'light' : 'dark' });
    }
  }, [config, onConfigChange]);

  /**
   * Keyboard input handler
   */
  useInput((input: string, key: Key) => {
    // If editing a number field, handle typing
    if (editingField === 'maxDepth' || editingField === 'refreshInterval') {
      if (key.return) {
        saveEdit();
      } else if (key.escape) {
        cancelEdit();
      } else if (key.backspace || key.delete) {
        setTempValue((prev) => prev.slice(0, -1));
      } else if (input && /^\d$/.test(input)) {
        setTempValue((prev) => prev + input);
      }
      return;
    }

    // Not editing, handle field selection
    if (input === 'd') {
      startEdit('maxDepth');
    } else if (input === 'i') {
      startEdit('refreshInterval');
    } else if (input === 'h') {
      toggleValue('showHidden');
    } else if (input === 't') {
      toggleValue('theme');
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Settings
        </Text>
      </Box>

      {/* General Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          [General]
        </Text>

        <Box marginLeft={2} flexDirection="column">
          <Text>
            <Text dimColor>Base Paths: </Text>
            <Text dimColor>(edit in ~/.config/delta-scope/settings.json)</Text>
          </Text>
          {config.basePaths.map((path, idx) => (
            <Text key={idx}>
              <Text dimColor>  • </Text>
              <Text>{path}</Text>
            </Text>
          ))}

          <Box marginTop={1}>
            <Text>
              <Text dimColor>Exclude Patterns: </Text>
              <Text dimColor>(edit in config file)</Text>
            </Text>
          </Box>
          {config.excludePatterns.slice(0, 5).map((pattern, idx) => (
            <Text key={idx}>
              <Text dimColor>  • </Text>
              <Text>{pattern}</Text>
            </Text>
          ))}
          {config.excludePatterns.length > 5 && (
            <Text dimColor>  ... and {config.excludePatterns.length - 5} more</Text>
          )}

          <Box marginTop={1}>
            <Text>
              <Text dimColor>Max Depth: </Text>
              {editingField === 'maxDepth' ? (
                <>
                  <Text color="yellow">{tempValue}_</Text>
                  <Text dimColor> (Enter to save, Esc to cancel)</Text>
                </>
              ) : (
                <>
                  <Text>{config.maxDepth}</Text>
                  {onConfigChange && (
                    <Text dimColor> (press d to edit)</Text>
                  )}
                </>
              )}
            </Text>
          </Box>

          <Text>
            <Text dimColor>Show Hidden: </Text>
            <Text>{config.showHidden ? 'Yes' : 'No'}</Text>
            {onConfigChange && (
              <Text dimColor> (press h to toggle)</Text>
            )}
          </Text>
        </Box>
      </Box>

      {/* UI Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          [UI]
        </Text>

        <Box marginLeft={2} flexDirection="column">
          <Text>
            <Text dimColor>Theme: </Text>
            <Text>{config.theme}</Text>
            {onConfigChange && (
              <Text dimColor> (press t to toggle)</Text>
            )}
          </Text>

          <Text>
            <Text dimColor>Refresh Interval: </Text>
            {editingField === 'refreshInterval' ? (
              <>
                <Text color="yellow">{tempValue}_</Text>
                <Text>s</Text>
                <Text dimColor> (Enter to save, Esc to cancel)</Text>
              </>
            ) : (
              <>
                <Text>{config.refreshInterval}s</Text>
                {onConfigChange && (
                  <Text dimColor> (press i to edit)</Text>
                )}
              </>
            )}
          </Text>
        </Box>
      </Box>

      {/* Favorites Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          [Favorites] <Text dimColor>(Read-only)</Text>
        </Text>

        <Box marginLeft={2} flexDirection="column">
          {config.favorites.length === 0 ? (
            <Text dimColor>  No favorites yet</Text>
          ) : (
            config.favorites.slice(0, 5).map((fav, idx) => (
              <Text key={idx}>
                <Text dimColor>  ★ </Text>
                <Text>{fav}</Text>
              </Text>
            ))
          )}
          {config.favorites.length > 5 && (
            <Text dimColor>  ... and {config.favorites.length - 5} more</Text>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="cyan" paddingX={1}>
        {editingField ? (
          <Text dimColor>Editing {editingField} | Enter: Save | Esc: Cancel</Text>
        ) : (
          <Text dimColor>
            Press Escape or c to close
            {onConfigChange && ' | d: Max Depth | i: Interval | h: Hidden | t: Theme'}
          </Text>
        )}
      </Box>
    </Box>
  );
};
