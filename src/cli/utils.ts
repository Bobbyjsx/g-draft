import chalk from 'chalk';
import ora from 'ora';
import { type CacheAction, cacheManager } from '../core/cache.js';
import { copyToClipboard } from '../core/clipboard.js';
import type { Config } from '../core/config.js';
import { GitService } from '../core/git.js';
import { logger } from '../core/logger.js';
import { getProvider } from '../providers/index.js';

interface PipelineOptions {
  action: string;
  config: Config;
  prompt: string;
  successMessage: string;
  hintMessage?: string;
  diffCommand?: string;
  copy?: boolean;
  diff?: string;
  metadata?: Record<string, unknown>;
}

const getLoadingMessages = (action: string, metadata?: Record<string, unknown>): string[] => {
  if (action === 'commit') {
    const mode = metadata?.mode as string;
    return [
      mode === 'staged' ? 'Analyzing your staged changes...' : 'Analyzing changes...',
      mode === 'last_commit' ? 'Analyzing last commit...' : 'Identifying key modified files...',
      'Interpreting code modifications...',
      'Summarizing logic changes...',
      'Structuring conventional commit message...',
    ];
  }
  if (action === 'pr') {
    const branch = metadata?.branch as string;
    return [
      branch ? `Comparing branch ${branch}...` : 'Comparing branch history...',
      'Scanning all branch diffs...',
      'Identifying core features and fixes...',
      'Applying project PR template...',
      'Generating detailed description...',
    ];
  }
  return [`Running ${action}...`, 'Processing...', 'Almost ready...'];
};

export const runAIPipeline = async ({
  action,
  config,
  prompt,
  successMessage,
  hintMessage,
  diffCommand,
  copy,
  diff,
  metadata,
}: PipelineOptions) => {
  const provider = getProvider(config.provider);

  if (!(await provider.isAvailable())) {
    console.error(chalk.red(`Error: Provider '${config.provider}' is not available.`));
    console.log(chalk.blue('Install:'), provider.installGuide);
    process.exit(1);
  }

  const messages = getLoadingMessages(action, metadata);
  const spinner = ora({
    color: 'cyan',
    text: messages[0],
  }).start();

  let messageIndex = 0;
  const interval = setInterval(() => {
    messageIndex = (messageIndex + 1) % messages.length;
    spinner.text = messages[messageIndex];
  }, 3000);

  try {
    const result = await provider.run(prompt);
    clearInterval(interval);
    spinner.succeed(chalk.green(`${successMessage} ${GitService.formatMode(metadata?.mode as string)}`));

    console.log(chalk.gray('---'));
    console.log(result);
    console.log(chalk.gray('---\n'));

    if (copy) {
      const copied = await copyToClipboard(result);
      if (copied) {
        console.log(chalk.cyan('✓ Result copied to clipboard'));
      }
    }

    if (hintMessage) {
      console.log(chalk.yellow(`Hint: ${hintMessage}`));
    }

    // Save to logs
    await logger.logAction({
      action,
      diffCommand,
      prompt,
      response: result,
      status: 'success',
    });

    // Save to cache for TUI persistence
    if (diff && ['commit', 'pr', 'review'].includes(action)) {
      cacheManager.set(action as CacheAction, {
        content: result,
        diffHash: cacheManager.generateDiffHash(diff),
        metadata,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  } catch (e: any) {
    clearInterval(interval);
    spinner.fail(chalk.red(`Error during ${action}`));
    console.error(chalk.red(e.message));

    await logger.logAction({
      action,
      diffCommand,
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
  diffMode?: 'staged' | 'branch' | 'auto' | 'last_commit';
  copy?: boolean;
}

export const runActionWithDiff = async ({
  action,
  config,
  gitService,
  getPrompt,
  successMessage,
  hintMessage,
  diffMode = 'auto',
  copy = false,
}: ActionWithDiffOptions) => {
  const { diff, command, mode } = await gitService.getDiff({
    baseBranch: config.baseBranch,
    mode: diffMode,
  });

  if (!diff) {
    console.error(chalk.yellow(`No changes detected for ${action}.`));
    process.exit(1);
  }

  let prompt = '';
  const metadata: Record<string, unknown> = { mode };

  if (action === 'pr') {
    const branch = await gitService.getCurrentBranch();
    metadata.branch = branch;
    const template = await gitService.getPRTemplate();
    const { PROMPTS } = await import('../core/prompts.js');
    prompt = template ? PROMPTS.PR_WITH_TEMPLATE(template, diff) : PROMPTS.PR_NO_TEMPLATE(diff);
  } else {
    prompt = getPrompt(diff);
  }

  return runAIPipeline({
    action,
    config,
    copy,
    diff,
    diffCommand: command,
    hintMessage,
    metadata,
    prompt,
    successMessage,
  });
};
