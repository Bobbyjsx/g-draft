import { Command } from 'commander';
import { runActionWithDiff } from '../utils.js';
import type { ConfigManager } from '../../core/config.js';
import type { GitService } from '../../core/git.js';
import { PROMPTS } from '../../core/prompts.js';

export const reviewCommand = (configManager: ConfigManager, gitService: GitService) => {
  return new Command('review')
    .description('Get AI-powered code review')
    .option('-m, --mode <mode>', 'Diff mode (staged, branch, auto)', 'auto')
    .option('-b, --base <branch>', 'Base branch to diff against')
    .option('-p, --provider <provider>', 'AI provider to use')
    .option('-c, --copy', 'Copy output to clipboard')
    .action(async (options) => {
      const config = configManager.getMergedConfig(options);
      await runActionWithDiff({
        action: 'review',
        config,
        copy: options.copy,
        diffMode: options.mode as any,
        getPrompt: (diff) => PROMPTS.REVIEW(diff),
        gitService,
        successMessage: 'AI Review Results',
      });
    });
};
