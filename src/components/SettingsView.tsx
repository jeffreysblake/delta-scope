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

type EditableField =
  | 'maxDepth'
  | 'refreshInterval'
  | 'showHidden'
  | 'theme'
  | 'aiEnabled'
  | 'aiProvider'
  | 'aiApiKey'
  | 'aiModel'
  | 'aiEndpoint'
  | 'aiAutoAnalyze'
  | 'aiMaxRecommendations'
  | 'aiTimeout'
  | null;

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
    } else if (field === 'aiApiKey') {
      setTempValue(config.ai?.apiKey || '');
    } else if (field === 'aiModel') {
      setTempValue(config.ai?.model || 'claude-sonnet-4-5');
    } else if (field === 'aiEndpoint') {
      setTempValue(config.ai?.endpoint || 'http://localhost:1234/v1');
    } else if (field === 'aiMaxRecommendations') {
      setTempValue(config.ai?.maxRecommendations?.toString() || '10');
    } else if (field === 'aiTimeout') {
      setTempValue(config.ai?.timeout?.toString() || '30000');
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
      } else if (editingField === 'aiApiKey') {
        onConfigChange({
          ai: {
            ...config.ai!,
            apiKey: tempValue.trim(),
          },
        });
      } else if (editingField === 'aiModel') {
        onConfigChange({
          ai: {
            ...config.ai!,
            model: tempValue.trim(),
          },
        });
      } else if (editingField === 'aiEndpoint') {
        onConfigChange({
          ai: {
            ...config.ai!,
            endpoint: tempValue.trim(),
          },
        });
      } else if (editingField === 'aiMaxRecommendations') {
        const value = parseInt(tempValue, 10);
        if (isNaN(value) || value < 1 || value > 50) {
          cancelEdit();
          return;
        }
        onConfigChange({
          ai: {
            ...config.ai!,
            maxRecommendations: value,
          },
        });
      } else if (editingField === 'aiTimeout') {
        const value = parseInt(tempValue, 10);
        if (isNaN(value) || value < 5000 || value > 120000) {
          cancelEdit();
          return;
        }
        onConfigChange({
          ai: {
            ...config.ai!,
            timeout: value,
          },
        });
      }

      cancelEdit();
    } catch {
      cancelEdit();
    }
  }, [editingField, tempValue, onConfigChange, cancelEdit, config.ai]);

  /**
   * Toggle boolean or cyclic values
   */
  const toggleValue = useCallback((field: EditableField) => {
    if (!onConfigChange) return;

    if (field === 'showHidden') {
      onConfigChange({ showHidden: !config.showHidden });
    } else if (field === 'theme') {
      onConfigChange({ theme: config.theme === 'dark' ? 'light' : 'dark' });
    } else if (field === 'aiEnabled') {
      onConfigChange({
        ai: {
          ...config.ai!,
          enabled: !config.ai!.enabled,
        },
      });
    } else if (field === 'aiAutoAnalyze') {
      onConfigChange({
        ai: {
          ...config.ai!,
          autoAnalyze: !config.ai!.autoAnalyze,
        },
      });
    } else if (field === 'aiProvider') {
      // Cycle through providers
      const providers: Array<'anthropic' | 'openai' | 'local'> = ['anthropic', 'openai', 'local'];
      const currentIndex = providers.indexOf(config.ai!.provider);
      const nextIndex = (currentIndex + 1) % providers.length;
      onConfigChange({
        ai: {
          ...config.ai!,
          provider: providers[nextIndex],
        },
      });
    }
  }, [config, onConfigChange]);

  /**
   * Keyboard input handler
   */
  useInput((input: string, key: Key) => {
    // If editing a number field, handle typing
    if (
      editingField === 'maxDepth' ||
      editingField === 'refreshInterval' ||
      editingField === 'aiMaxRecommendations' ||
      editingField === 'aiTimeout'
    ) {
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

    // If editing a text field, handle typing
    if (editingField === 'aiApiKey' || editingField === 'aiModel' || editingField === 'aiEndpoint') {
      if (key.return) {
        saveEdit();
      } else if (key.escape) {
        cancelEdit();
      } else if (key.backspace || key.delete) {
        setTempValue((prev) => prev.slice(0, -1));
      } else if (input && input.length === 1 && /[\w\-:.\/]/.test(input)) {
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
    } else if (input === 'e' && config.ai) {
      toggleValue('aiEnabled');
    } else if (input === 'p' && config.ai) {
      toggleValue('aiProvider');
    } else if (input === 'k' && config.ai) {
      startEdit('aiApiKey');
    } else if (input === 'm' && config.ai) {
      startEdit('aiModel');
    } else if (input === 'u' && config.ai) {
      startEdit('aiEndpoint');
    } else if (input === 'a' && config.ai) {
      toggleValue('aiAutoAnalyze');
    } else if (input === 'n' && config.ai) {
      startEdit('aiMaxRecommendations');
    } else if (input === 'o' && config.ai) {
      startEdit('aiTimeout');
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

      {/* AI Section */}
      {config.ai && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="yellow">
            [AI Agent]
          </Text>

          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text dimColor>Enabled: </Text>
              <Text color={config.ai.enabled ? 'green' : 'red'}>
                {config.ai.enabled ? 'Yes' : 'No'}
              </Text>
              {onConfigChange && (
                <Text dimColor> (press e to toggle)</Text>
              )}
            </Text>

            <Text>
              <Text dimColor>Provider: </Text>
              <Text>{config.ai.provider}</Text>
              {onConfigChange && (
                <Text dimColor> (press p to cycle)</Text>
              )}
            </Text>

            <Text>
              <Text dimColor>API Key: </Text>
              {editingField === 'aiApiKey' ? (
                <>
                  <Text color="yellow">{'*'.repeat(tempValue.length)}_</Text>
                  <Text dimColor> (Enter to save, Esc to cancel)</Text>
                </>
              ) : (
                <>
                  <Text>{config.ai.apiKey ? '****' + config.ai.apiKey.slice(-4) : 'Not set'}</Text>
                  {onConfigChange && (
                    <Text dimColor> (press k to edit)</Text>
                  )}
                </>
              )}
            </Text>

            <Text>
              <Text dimColor>Model: </Text>
              {editingField === 'aiModel' ? (
                <>
                  <Text color="yellow">{tempValue}_</Text>
                  <Text dimColor> (Enter to save, Esc to cancel)</Text>
                </>
              ) : (
                <>
                  <Text>{config.ai.model}</Text>
                  {onConfigChange && (
                    <Text dimColor> (press m to edit)</Text>
                  )}
                </>
              )}
            </Text>

            {(config.ai.provider === 'local' || config.ai.provider === 'openai') && (
              <Text>
                <Text dimColor>Endpoint: </Text>
                {editingField === 'aiEndpoint' ? (
                  <>
                    <Text color="yellow">{tempValue}_</Text>
                    <Text dimColor> (Enter to save, Esc to cancel)</Text>
                  </>
                ) : (
                  <>
                    <Text>{config.ai.endpoint || 'http://localhost:1234/v1'}</Text>
                    {onConfigChange && (
                      <Text dimColor> (press u to edit)</Text>
                    )}
                  </>
                )}
              </Text>
            )}

            <Text>
              <Text dimColor>Auto-Analyze: </Text>
              <Text>{config.ai.autoAnalyze ? 'Yes' : 'No'}</Text>
              {onConfigChange && (
                <Text dimColor> (press a to toggle)</Text>
              )}
            </Text>

            <Text>
              <Text dimColor>Max Recommendations: </Text>
              {editingField === 'aiMaxRecommendations' ? (
                <>
                  <Text color="yellow">{tempValue}_</Text>
                  <Text dimColor> (Enter to save, Esc to cancel)</Text>
                </>
              ) : (
                <>
                  <Text>{config.ai.maxRecommendations}</Text>
                  {onConfigChange && (
                    <Text dimColor> (press n to edit)</Text>
                  )}
                </>
              )}
            </Text>

            <Text>
              <Text dimColor>Timeout: </Text>
              {editingField === 'aiTimeout' ? (
                <>
                  <Text color="yellow">{tempValue}_</Text>
                  <Text>ms</Text>
                  <Text dimColor> (Enter to save, Esc to cancel)</Text>
                </>
              ) : (
                <>
                  <Text>{config.ai.timeout}ms</Text>
                  {onConfigChange && (
                    <Text dimColor> (press o to edit)</Text>
                  )}
                </>
              )}
            </Text>
          </Box>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="cyan" paddingX={1}>
        {editingField ? (
          <Text dimColor>Editing {editingField} | Enter: Save | Esc: Cancel</Text>
        ) : (
          <Box flexDirection="column">
            <Text dimColor>
              Press Escape or c to close
              {onConfigChange && ' | d: MaxDepth | i: Interval | h: Hidden | t: Theme'}
            </Text>
            {config.ai && onConfigChange && (
              <Text dimColor>
                AI: e: Enable | p: Provider | k: ApiKey | m: Model | u: Endpoint | a: AutoAnalyze | n: MaxRecs | o: Timeout
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
