import chalk from 'chalk';
import { Command } from 'commander';
import type { ConfigManager } from '../../core/config.js';
import type { GitService } from '../../core/git.js';

export const initCommand = (configManager: ConfigManager, gitService: GitService) => {
  return new Command('init').description('Initialize gdraft in current project').action(async () => {
    if (!(await gitService.isRepo())) {
      console.error(chalk.red('Error: Not a git repository'));
      process.exit(1);
    }

    const currentBranch = await gitService.getCurrentBranch();
    const defaultBranch = currentBranch === 'main' || currentBranch === 'master' ? currentBranch : 'main';

    const config = {
      baseBranch: defaultBranch,
      provider: 'gemini' as const,
    };

    configManager.setProjectConfig(config);
    console.log(chalk.green('Initialized .gdraft.json'));
    console.log(chalk.blue('Base branch:'), defaultBranch);
    console.log(chalk.blue('Provider:'), 'gemini');
  });
};
