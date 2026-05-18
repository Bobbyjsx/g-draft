#!/usr/bin/env node
import { Command } from 'commander';
import pkg from '../../package.json' with { type: 'json' };

const version = pkg.version;

import { ConfigManager } from '../core/config.js';
import { GitService } from '../core/git.js';
import { logger } from '../core/logger.js';
import { commitCommand } from './commands/commit.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';
import { prCommand } from './commands/pr.js';
import { providersCommand } from './commands/providers.js';
import { reviewCommand } from './commands/review.js';
import { tuiCommand } from './commands/tui.js';

const program = new Command();
const configManager = new ConfigManager();
const gitService = new GitService();

// Initialize logger with config
const config = configManager.getMergedConfig();
logger.init(config);

program.name('gdraft').description('AI-Powered Git Assistant (CLI + TUI)').version(version);

program.addCommand(initCommand(configManager, gitService));
program.addCommand(commitCommand(configManager, gitService));
program.addCommand(prCommand(configManager, gitService));
program.addCommand(reviewCommand(configManager, gitService));
program.addCommand(configCommand(configManager));
program.addCommand(providersCommand());
program.addCommand(tuiCommand(configManager, gitService));

// Ensure logger flushes before exit
const shutdown = async () => {
  await logger.shutdown();
};

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

// Default to TUI if no command is provided
program.action(async () => {
  if (program.args.length === 0) {
    await tuiCommand(configManager, gitService).parseAsync(process.argv);
  }
});

program.parseAsync(process.argv).then(async () => {
  await shutdown();
});
