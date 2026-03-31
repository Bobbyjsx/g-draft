import { Command } from 'commander';
import { runActionWithDiff } from '../utils.js';
import type { ConfigManager } from '../../core/config.js';
import type { GitService } from '../../core/git.js';

export const prCommand = (configManager: ConfigManager, gitService: GitService) => {
  return new Command('pr')
    .description('Generate pull request description')
    .option('-m, --mode <mode>', 'Diff mode (staged, branch, auto)', 'branch')
    .option('-b, --base <branch>', 'Base branch to diff against')
    .option('-p, --provider <provider>', 'AI provider to use')
    .action(async (options) => {
      const config = configManager.getMergedConfig(options);
      await runActionWithDiff({
        action: 'pr',
        config,
        diffMode: options.mode as any,
        getPrompt: () => '', // Handled specially inside runActionWithDiff for PR
        gitService,
        successMessage: 'Generated PR',
      });
    });
};
