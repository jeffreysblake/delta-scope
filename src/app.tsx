/**
 * Main App component
 */

import React from 'react';
import { Dashboard } from './components/Dashboard.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
};
