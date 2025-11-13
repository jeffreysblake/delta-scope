/**
 * Notification component
 * Displays user feedback messages with improved styling and context
 */

import React from 'react';
import { Box, Text } from 'ink';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  dismissible?: boolean;
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
  }
}

/**
 * Get color for notification type
 */
function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'green';
    case 'error':
      return 'red';
    case 'warning':
      return 'yellow';
    case 'info':
      return 'cyan';
  }
}

/**
 * Get border style for notification type
 */
function getBorderStyle(type: NotificationType): 'single' | 'bold' {
  return type === 'error' ? 'bold' : 'single';
}

export const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  dismissible = true,
}) => {
  const icon = getNotificationIcon(type);
  const color = getNotificationColor(type);
  const borderStyle = getBorderStyle(type);

  return (
    <Box
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={color}
      paddingX={1}
    >
      <Box>
        <Text color={color}>
          {icon} {message}
        </Text>
      </Box>
      {dismissible && (
        <Box marginTop={1}>
          <Text dimColor>Press any key to dismiss</Text>
        </Box>
      )}
    </Box>
  );
};
