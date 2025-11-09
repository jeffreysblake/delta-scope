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
    render(<App />);
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
