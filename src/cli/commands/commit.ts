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
      const info = await gitService.getProjectInfo();
      const promptOptions = {
        customInstructions: config.customInstructions,
        projectContext: info ? `${info.name} at ${info.path}` : undefined,
      };

      await runActionWithDiff({
        action: 'commit',
        config,
        copy: options.copy,
        diffMode: 'auto',
        getPrompt: (diff) => PROMPTS.COMMIT(diff, promptOptions),
        gitService,
        hintMessage: 'Use "gdraft tui" for interactive editing and committing.',
        successMessage: 'Generated Message',
      });
    });
};
