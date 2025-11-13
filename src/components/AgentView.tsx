/**
 * Agent View - Display AI recommendations and insights
 */

import React, { useState } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { AgentResponse } from '../types/agent.js';

interface AgentViewProps {
  response: AgentResponse | null;
  isLoading: boolean;
  error: string | null;
  onDismiss?: (recommendationId: string) => void;
  onExecute?: (recommendationId: string, actionId: string) => void;
}

const PRIORITY_COLORS = {
  high: 'red',
  medium: 'yellow',
  low: 'cyan',
} as const;

const PRIORITY_SYMBOLS = {
  high: '🔴',
  medium: '🟡',
  low: '🔵',
} as const;

const TYPE_LABELS = {
  cleanup: 'Cleanup',
  workflow: 'Workflow',
  health: 'Health',
  action: 'Action',
  optimization: 'Optimization',
} as const;

export const AgentView: React.FC<AgentViewProps> = ({
  response,
  isLoading,
  error,
  onDismiss,
  onExecute,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const recommendations = response?.recommendations || [];
  const insights = response?.insights;

  // Keyboard navigation
  useInput((input: string, key: Key) => {
    if (isLoading) return;

    // Navigate up/down
    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => Math.min(recommendations.length - 1, prev + 1));
    }

    // Expand/collapse
    if (key.return || input === ' ') {
      if (expandedIndex === selectedIndex) {
        setExpandedIndex(null);
      } else {
        setExpandedIndex(selectedIndex);
      }
    }

    // Dismiss
    if (input === 'x' && onDismiss) {
      const rec = recommendations[selectedIndex];
      if (rec) {
        onDismiss(rec.id);
      }
    }

    // Execute first action
    if (input === 'e' && onExecute) {
      const rec = recommendations[selectedIndex];
      if (rec && rec.actions.length > 0) {
        onExecute(rec.id, rec.actions[0].id);
      }
    }
  });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">🤖 AI Agent is analyzing your repositories...</Text>
        <Text dimColor>This may take a few moments.</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box borderStyle="single" borderColor="red" padding={1} flexDirection="column">
        <Text color="red" bold>
          ❌ Agent Error
        </Text>
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press Escape to close</Text>
        </Box>
      </Box>
    );
  }

  if (!response || recommendations.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">✨ All clear!</Text>
        <Text dimColor>No recommendations at this time. Your repositories look healthy!</Text>
        {insights && (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>
              • Repos needing attention: {insights.repos_needing_attention}
            </Text>
            <Text dimColor>
              • Potential for archival: {insights.potential_archival}
            </Text>
            <Text dimColor>
              • Health trend: {insights.health_improving ? '📈 Improving' : '📊 Stable'}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1} marginBottom={1}>
        <Text bold color="cyan">
          🤖 AI Insights
        </Text>
        <Text dimColor> — {recommendations.length} recommendations</Text>
      </Box>

      {/* Insights Summary */}
      {insights && (
        <Box borderStyle="single" borderColor="gray" paddingX={1} marginBottom={1} flexDirection="column">
          <Text bold>Summary:</Text>
          <Box>
            <Text dimColor>
              {insights.repos_needing_attention} need attention • {insights.potential_archival} can
              be archived • Health {insights.health_improving ? '↗' : '→'}
            </Text>
          </Box>
          {insights.workflow_patterns && insights.workflow_patterns.length > 0 && (
            <Box marginTop={0}>
              <Text dimColor>Patterns: {insights.workflow_patterns.join(', ')}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Recommendations List */}
      <Box flexDirection="column">
        {recommendations.map((rec, idx) => {
          const isSelected = idx === selectedIndex;
          const isExpanded = idx === expandedIndex;
          const priorityColor = PRIORITY_COLORS[rec.priority];
          const prioritySymbol = PRIORITY_SYMBOLS[rec.priority];
          const typeLabel = TYPE_LABELS[rec.type];

          return (
            <Box
              key={rec.id}
              borderStyle={isSelected ? 'bold' : 'single'}
              borderColor={isSelected ? 'cyan' : 'gray'}
              paddingX={1}
              marginBottom={1}
              flexDirection="column"
            >
              {/* Header Line */}
              <Box>
                <Text color={priorityColor}>{prioritySymbol}</Text>
                <Text bold={isSelected}> {rec.title}</Text>
                <Text dimColor> ({typeLabel})</Text>
              </Box>

              {/* Description */}
              {isExpanded && (
                <Box flexDirection="column" marginTop={0}>
                  <Text>{rec.description}</Text>

                  {/* Affected Repos */}
                  {rec.affected_repos.length > 0 && (
                    <Box marginTop={1} flexDirection="column">
                      <Text dimColor>
                        Affects {rec.affected_repos.length} repo(s):
                      </Text>
                      {rec.affected_repos.slice(0, 5).map((repo) => (
                        <Text key={repo} dimColor>
                          • {repo}
                        </Text>
                      ))}
                      {rec.affected_repos.length > 5 && (
                        <Text dimColor>
                          ... and {rec.affected_repos.length - 5} more
                        </Text>
                      )}
                    </Box>
                  )}

                  {/* Actions */}
                  {rec.actions.length > 0 && (
                    <Box marginTop={1} flexDirection="column">
                      <Text dimColor>Available actions:</Text>
                      {rec.actions.map((action) => (
                        <Box key={action.id}>
                          <Text color={action.safe ? 'green' : 'yellow'}>
                            • {action.label}
                          </Text>
                          {action.requires_confirmation && (
                            <Text dimColor> (requires confirmation)</Text>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* Quick Actions Hint */}
              {isSelected && !isExpanded && (
                <Box marginTop={0}>
                  <Text dimColor>Press Enter to expand</Text>
                </Box>
              )}

              {isSelected && isExpanded && (
                <Box marginTop={0}>
                  <Text dimColor>
                    e: Execute • x: Dismiss • Space: Collapse
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Processing Time */}
      {response.processing_time_ms && (
        <Box marginTop={1}>
          <Text dimColor>
            Analysis completed in {(response.processing_time_ms / 1000).toFixed(2)}s
          </Text>
        </Box>
      )}
    </Box>
  );
};
