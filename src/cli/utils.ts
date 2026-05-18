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
  diffPath?: string;
  metadata?: Record<string, unknown>;
  modelId?: string;
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
  diffPath,
  metadata,
  modelId,
}: PipelineOptions) => {
  const provider = getProvider(config.provider);

  if (!(await provider.isAvailable())) {
    console.error(chalk.red(`Error: Provider '${config.provider}' is not available.`));
    console.log(chalk.blue('Install:'), provider.installGuide);
    process.exit(1);
  }

  // Pre-warm if supported
  if (provider.prewarm) {
    provider.prewarm(modelId).catch(() => {});
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
    let result = '';
    let thought = '';
    let streamError: string | null = null;

    await provider.stream(
      prompt,
      {
        onError: (err) => {
          streamError = err;
          console.error(chalk.red(`\nProvider Error: ${err}`));
        },
        onText: (text) => {
          result += text;
        },
        onThought: (t) => {
          thought += t;
          const thoughtLines = thought.split('\n').filter((l) => l.trim() !== '');
          const lastLines = thoughtLines.slice(-3).join(' ➜ ');
          if (lastLines) {
            spinner.text = chalk.dim(`[AGENT] ${lastLines.substring(0, 100)}${lastLines.length > 100 ? '...' : ''}`);
          }
        },
      },
      diffPath
    );

    if (streamError) {
      throw new Error(streamError);
    }

    clearInterval(interval);
    spinner.succeed(chalk.green(`${successMessage} ${GitService.formatMode(metadata?.mode as string)}`));

    console.log(chalk.gray('--- Response ---'));
    console.log(result);
    console.log(chalk.gray('----------------\n'));

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
      thought,
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

  // Save to temp file for large payload support
  const diffPath = await gitService.saveDiffToTempFile(diff);

  const info = await gitService.getProjectInfo();
  const promptOptions = {
    customInstructions: config.customInstructions,
    projectContext: info ? `${info.name} at ${info.path}` : undefined,
  };

  let prompt = '';
  const metadata: Record<string, unknown> = { mode };

  if (action === 'pr') {
    const branch = await gitService.getCurrentBranch();
    metadata.branch = branch;
    const template = await gitService.getPRTemplate();
    const { PROMPTS } = await import('../core/prompts.js');
    prompt = template ? PROMPTS.PR_WITH_TEMPLATE(template, diff, promptOptions) : PROMPTS.PR_NO_TEMPLATE(diff, promptOptions);
  } else {
    prompt = getPrompt(diff); // Note: getPrompt should ideally accept promptOptions too, but for simplicity we'll keep it for now or update callers.
  }

  return runAIPipeline({
    action,
    config,
    copy,
    diff,
    diffCommand: command,
    diffPath,
    hintMessage,
    metadata,
    modelId: action === 'commit' ? 'gemini-3-flash' : 'auto-gemini-3',
    prompt,
    successMessage,
  });
};
