import React from 'react';
import chalk from 'chalk';
import { Command } from 'commander';
import { render } from 'ink';
import type { ConfigManager } from '../../core/config.js';
import type { GitService } from '../../core/git.js';
import { App } from '../../tui/App.js';

export const tuiCommand = (configManager: ConfigManager, gitService: GitService) => {
  return new Command('tui').description('Launch interactive terminal UI').action(async () => {
    if (!(await gitService.isRepo())) {
      console.error(chalk.red('Error: Not a git repository'));
      process.exit(1);
    }

    const config = configManager.getMergedConfig();

    // Enter alternate screen buffer to allow clean exit (removing TUI from terminal)
    process.stdout.write('\u001b[?1049h');

    const { waitUntilExit } = render(
      React.createElement(App, {
        configManager,
        gitService,
        initialConfig: config,
      })
    );

    try {
      await waitUntilExit();
    } finally {
      // Exit alternate screen buffer
      process.stdout.write('\u001b[?1049l');
      // Force exit to ensure no background tasks hang the process
      process.exit(0);
    }
  });
};
