import { Command } from 'commander';
import { runActionWithDiff } from '../utils.js';
import type { ConfigManager } from '../../core/config.js';
import type { GitService } from '../../core/git.js';
import { PROMPTS } from '../../core/prompts.js';

export const commitCommand = (configManager: ConfigManager, gitService: GitService) => {
  return new Command('commit')
    .description('Generate commit message from staged changes')
    .option('-p, --provider <provider>', 'AI provider to use')
    .option('-c, --copy', 'Copy output to clipboard')
    .action(async (options) => {
      const config = configManager.getMergedConfig(options);
      await runActionWithDiff({
        action: 'commit',
        config,
        copy: options.copy,
        diffMode: 'auto',
        getPrompt: (diff) => PROMPTS.COMMIT(diff),
        gitService,
        hintMessage: 'Use "gdraft tui" for interactive editing and committing.',
        successMessage: 'Generated Message',
      });
    });
};
