#!/usr/bin/env node

/**
 * CLI entry point for delta-scope
 */

import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from './app.js';
import { configManager } from './services/configManager.js';

const program = new Command();

program
  .name('delta-scope')
  .description('Power-user TUI for managing chaos across multiple git repositories')
  .version('0.1.0');

program
  .command('start', { isDefault: true })
  .description('Start the TUI (default)')
  .action(() => {
    // Check if stdin supports TTY/raw mode
    if (!process.stdin.isTTY) {
      console.error('Error: delta-scope requires an interactive terminal (TTY).');
      console.error('Please run this command directly in your terminal, not through a pipe or background process.');
      process.exit(1);
    }

    // Check if stdin supports setRawMode
    if (typeof process.stdin.setRawMode !== 'function') {
      console.error('Error: Your terminal does not support raw mode, which is required for delta-scope.');
      console.error('Please ensure you are running this in a proper terminal emulator.');
      process.exit(1);
    }

    // Enter alternate screen buffer for proper TUI rendering
    // This prevents content overlap and provides clean screen management
    process.stdout.write('\x1b[?1049h'); // Enter alternate screen
    process.stdout.write('\x1b[2J');     // Clear entire screen
    process.stdout.write('\x1b[H');      // Move cursor to home position

    // Function to cleanly exit alternate screen
    const exitAlternateScreen = () => {
      process.stdout.write('\x1b[?1049l'); // Exit alternate screen
    };

    // Handle various exit signals to ensure clean screen restoration
    process.on('SIGINT', () => {
      exitAlternateScreen();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      exitAlternateScreen();
      process.exit(0);
    });

    const instance = render(<App />, {
      stdout: process.stdout,
      stdin: process.stdin,
      exitOnCtrlC: true,
      patchConsole: false,
    });

    // Clean up alternate screen on normal exit
    instance.waitUntilExit().then(() => {
      exitAlternateScreen();
    });
  });

program
  .command('config')
  .description('Show configuration file path')
  .action(() => {
    console.log('Config file:', configManager.getConfigPath());
    console.log('\nCurrent configuration:');
    console.log(JSON.stringify(configManager.get(), null, 2));
  });

program
  .command('add-path <path>')
  .description('Add a base path to scan for repositories')
  .action((path: string) => {
    configManager.addBasePath(path);
    console.log(`Added base path: ${path}`);
  });

program
  .command('reset-config')
  .description('Reset configuration to defaults')
  .action(() => {
    configManager.reset();
    console.log('Configuration reset to defaults');
  });

program.parse();
