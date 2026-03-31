#!/usr/bin/env node
import { Command } from 'commander';
import pkg from '../../package.json' with { type: 'json' };

const version = pkg.version;

import { ConfigManager } from '../core/config.js';
import { GitService } from '../core/git.js';
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

program.name('gdraft').description('AI-Powered Git Assistant (CLI + TUI)').version(version);

program.addCommand(initCommand(configManager, gitService));
program.addCommand(commitCommand(configManager, gitService));
program.addCommand(prCommand(configManager, gitService));
program.addCommand(reviewCommand(configManager, gitService));
program.addCommand(configCommand(configManager));
program.addCommand(providersCommand());
program.addCommand(tuiCommand(configManager, gitService));

// Default to TUI if no command is provided
program.action(() => {
  if (program.args.length === 0) {
    tuiCommand(configManager, gitService).parseAsync(process.argv);
  }
});

program.parseAsync(process.argv);
