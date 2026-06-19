import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { paths } from './paths.js';

export interface DiffOptions {
  mode?: 'staged' | 'branch' | 'auto' | 'last_commit';
  baseBranch?: string;
}

export const DEFAULT_DIFF_EXCLUDES = [
  ':!package-lock.json',
  ':!pnpm-lock.yaml',
  ':!yarn.lock',
  ':!bun.lockb',
  ':!*.lock',
  ':!dist/*',
  ':!node_modules/*',
];

export class GitService {
  async isRepo(): Promise<boolean> {
    try {
      await execa('git', ['--no-pager', 'rev-parse', '--is-inside-work-tree']);
      return true;
    } catch {
      return false;
    }
  }

  async getProjectInfo(): Promise<{ id: string; name: string; path: string }> {
    try {
      const { stdout: root } = await execa('git', ['--no-pager', 'rev-parse', '--show-toplevel']);
      const projectPath = root.trim();
      const projectName = path.basename(projectPath);
      return {
        id: paths.getProjectId(projectPath),
        name: projectName,
        path: projectPath,
      };
    } catch {
      const currentPath = process.cwd();
      return {
        id: paths.getProjectId(currentPath),
        name: path.basename(currentPath),
        path: currentPath,
      };
    }
  }

  async saveDiffToTempFile(diff: string): Promise<string> {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `gdraft-diff-${Date.now()}.txt`);
    fs.writeFileSync(filePath, diff, 'utf8');
    return filePath;
  }

  async getCurrentBranch(): Promise<string> {
    // Attempt 1: Modern Git
    try {
      const { stdout } = await execa('git', ['--no-pager', 'branch', '--show-current']);
      const branch = stdout.trim();
      if (branch && branch !== 'HEAD') return branch;
    } catch {
      // Ignore and try fallback
    }

    // Attempt 2: Fallback for older git versions or detached HEAD
    try {
      const { stdout: fallback } = await execa('git', ['--no-pager', 'rev-parse', '--abbrev-ref', 'HEAD']);
      const finalBranch = fallback.trim();
      return finalBranch === 'HEAD' ? 'detached' : finalBranch;
    } catch {
      return 'main';
    }
  }

  /**
   * Resolves comparison targets and retrieves the actual line-by-line unified git diff.
   * Depending on options or active auto-detection, it retrieves staged, branch-level,
   * unstaged, or last-commit changes.
   *
   * Difference from getDiffStat/getDiffData:
   * - getDiff: Returns the full, line-by-line content of the diff.
   * - getDiffStat: Returns only the file summary/statistics of changes.
   * - getDiffData: Runs both getDiff and getDiffStat in parallel.
   *
   * @param options Config options specifying the comparison mode ('staged', 'branch', 'last_commit', or 'auto') and base branch.
   * @returns An object containing the raw diff content, the exact git command executed, and the resolved comparison mode.
   */
  async getDiff(options: DiffOptions = {}): Promise<{ diff: string; command: string; mode: string }> {
    const { mode = 'auto', baseBranch = 'main' } = options;

    try {
      if (mode === 'staged') {
        const cmd = 'git --no-pager diff --cached';
        const { stdout } = await execa('git', ['--no-pager', 'diff', '--cached', '--', '.', ...DEFAULT_DIFF_EXCLUDES]);
        return { command: cmd, diff: stdout, mode: 'staged' };
      }

      if (mode === 'last_commit') {
        const { stdout: count } = await execa('git', ['--no-pager', 'rev-list', '--count', 'HEAD']);
        if (parseInt(count.trim(), 10) > 0) {
          if (parseInt(count.trim(), 10) === 1) {
            const cmd = 'git --no-pager diff 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD';
            const { stdout: firstCommit } = await execa('git', [
              '--no-pager',
              'diff',
              '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
              'HEAD',
              '--',
              '.',
              ...DEFAULT_DIFF_EXCLUDES,
            ]);
            return { command: cmd, diff: firstCommit, mode: 'first_commit' };
          }
          const cmd = 'git --no-pager diff HEAD~1..HEAD';
          const { stdout: lastCommit } = await execa('git', [
            '--no-pager',
            'diff',
            'HEAD~1..HEAD',
            '--',
            '.',
            ...DEFAULT_DIFF_EXCLUDES,
          ]);
          return { command: cmd, diff: lastCommit, mode: 'last_commit' };
        }
        return { command: '', diff: '', mode: 'none' };
      }

      if (mode === 'branch') {
        try {
          const { stdout: mergeBase } = await execa('git', ['--no-pager', 'merge-base', baseBranch, 'HEAD']);
          const mb = mergeBase.trim();
          const cmd = `git --no-pager merge-base ${baseBranch} HEAD && git --no-pager diff ${mb}`;
          const { stdout } = await execa('git', ['--no-pager', 'diff', mb, '--', '.', ...DEFAULT_DIFF_EXCLUDES]);
          return { command: cmd, diff: stdout, mode: 'branch' };
        } catch {
          // Fallback to triple-dot if merge-base fails
          const cmd = `git --no-pager diff ${baseBranch}...`;
          const { stdout } = await execa('git', ['--no-pager', 'diff', `${baseBranch}...`, '--', '.', ...DEFAULT_DIFF_EXCLUDES]);
          return { command: cmd, diff: stdout, mode: 'branch' };
        }
      }
    } catch {
      return { command: '', diff: '', mode: 'error' };
    }

    // Auto logic
    // 1. Prioritize staged changes
    const stagedResult = await this.getDiff({ mode: 'staged' });
    if (stagedResult.diff) return stagedResult;

    // 2. If on a branch, show the whole branch diff (including local changes)
    const currentBranch = await this.getCurrentBranch();
    if (currentBranch !== baseBranch && currentBranch !== 'detached') {
      const branchResult = await this.getDiff({ baseBranch, mode: 'branch' });
      if (branchResult.diff) return branchResult;
    }

    // 3. If on base branch, show unstaged changes
    try {
      const cmd = 'git --no-pager diff';
      const { stdout: unstaged } = await execa('git', ['--no-pager', 'diff', '--', '.', ...DEFAULT_DIFF_EXCLUDES]);
      if (unstaged) return { command: cmd, diff: unstaged, mode: 'unstaged' };
    } catch {
      // Ignore
    }

    // 4. Fallback to last commit
    return this.getDiff({ mode: 'last_commit' });
  }

  /**
   * Retrieves high-level git diff summary statistics (`git diff --stat`), showing
   * which files changed and the number of insertions/deletions per file.
   *
   * Difference from getDiff/getDiffData:
   * - getDiffStat: Fast and lightweight, returning only file lists and change counts.
   * - getDiff: Fetches full code diffs, which can be extremely large.
   * - getDiffData: Combines both.
   *
   * @param options Config options matching the diff target options.
   * @returns A string summary of file diff statistics.
   */
  async getDiffStat(options: DiffOptions = {}): Promise<string> {
    const { mode = 'auto', baseBranch = 'main' } = options;

    try {
      const args = ['--no-pager', 'diff', '--stat'];
      if (mode === 'staged') args.push('--cached');
      else if (mode === 'last_commit') args.push('HEAD~1..HEAD');
      else if (mode === 'branch') args.push(baseBranch);

      args.push('--', '.', ...DEFAULT_DIFF_EXCLUDES);
      const { stdout } = await execa('git', args);
      return stdout.trim();
    } catch {
      return '';
    }
  }

  /**
   * Concurrently retrieves both the line-by-line unified diff and the file summary statistics
   * in parallel using Promise.all to minimize command execution overhead.
   *
   * Difference from getDiff/getDiffStat:
   * - getDiffData: Orchestrates getDiff and getDiffStat concurrently for operations that need both.
   *
   * @param options Config options for diff retrieval.
   * @returns Concurrently fetched diff content, stat summary, and mode.
   */
  async getDiffData(options: DiffOptions = {}): Promise<{ diff: string; stat: string; mode: string }> {
    const [diffResult, stat] = await Promise.all([this.getDiff(options), this.getDiffStat(options)]);

    return {
      diff: diffResult.diff,
      mode: diffResult.mode,
      stat,
    };
  }

  static formatMode(m?: string): string {
    if (!m) return '';
    const modes: Record<string, string> = {
      branch: 'from branch diff',
      first_commit: 'from first commit',
      last_commit: 'from last commit',
      staged: 'from staged changes',
      unstaged: 'from unstaged changes',
    };
    return modes[m] || `via ${m}`;
  }

  async getPRTemplate(): Promise<string | null> {
    const templatePaths = [
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/pull_request_template.md',
      '.github/PULL_REQUEST_TEMPLATE/template.md',
      '.github/pull_request_template/template.md',
      'PULL_REQUEST_TEMPLATE.md',
      'pull_request_template.md',
    ];

    for (const p of templatePaths) {
      const fullPath = path.join(process.cwd(), p);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf8');
      }
    }
    return null;
  }

  async commit(message: string): Promise<void> {
    await execa('git', ['--no-pager', 'commit', '-m', message]);
  }
}
