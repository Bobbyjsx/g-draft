import chalk from 'chalk';
import type { Config } from '../core/config.js';
import type { GitService } from '../core/git.js';
import { logger } from '../core/logger.js';
import { getProvider } from '../providers/index.js';

interface PipelineOptions {
  action: string;
  config: Config;
  prompt: string;
  successMessage: string;
  hintMessage?: string;
}

export const runAIPipeline = async ({ action, config, prompt, successMessage, hintMessage }: PipelineOptions) => {
  const provider = getProvider(config.provider);

  if (!(await provider.isAvailable())) {
    console.error(chalk.red(`Error: Provider '${config.provider}' is not available.`));
    console.log(chalk.blue('Install:'), provider.installGuide);
    process.exit(1);
  }

  console.log(chalk.blue(`Running ${action} with ${config.provider}...`));

  try {
    const result = await provider.run(prompt);

    console.log(chalk.green(`\n${successMessage}:`));
    console.log(chalk.gray('---'));
    console.log(result);
    console.log(chalk.gray('---\n'));

    if (hintMessage) {
      console.log(chalk.yellow(`Hint: ${hintMessage}`));
    }

    await logger.logAction({
      action,
      prompt,
      response: result,
      status: 'success',
    });

    return result;
  } catch (e: any) {
    console.error(chalk.red(`Error during ${action}:`), e.message);

    await logger.logAction({
      action,
      error: e.message,
      prompt,
      response: '',
      status: 'error',
    });

    process.exit(1);
  }
};

interface ActionWithDiffOptions {
  action: string;
  config: Config;
  gitService: GitService;
  getPrompt: (diff: string) => string;
  getPRPrompt?: (template: string, diff: string) => string;
  successMessage: string;
  hintMessage?: string;
  diffMode?: 'staged' | 'branch' | 'auto';
}

export const runActionWithDiff = async ({
  action,
  config,
  gitService,
  getPrompt,
  successMessage,
  hintMessage,
  diffMode = 'auto',
}: ActionWithDiffOptions) => {
  const diff = await gitService.getDiff({
    baseBranch: config.baseBranch,
    mode: diffMode,
  });

  if (!diff) {
    console.error(chalk.yellow(`No changes detected for ${action}.`));
    process.exit(1);
  }

  let prompt = '';
  if (action === 'pr') {
    const template = await gitService.getPRTemplate();
    const { PROMPTS } = await import('../core/prompts.js');
    prompt = template ? PROMPTS.PR_WITH_TEMPLATE(template, diff) : PROMPTS.PR_NO_TEMPLATE(diff);
  } else {
    prompt = getPrompt(diff);
  }

  return runAIPipeline({
    action,
    config,
    hintMessage,
    prompt,
    successMessage,
  });
};
