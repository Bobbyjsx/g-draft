import fs from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';

export interface DiffOptions {
  mode: 'staged' | 'branch' | 'auto';
  baseBranch?: string;
}

export class GitService {
  async isRepo(): Promise<boolean> {
    try {
      await execa('git', ['rev-parse', '--is-inside-work-tree']);
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    // Attempt 1: Modern Git
    try {
      const { stdout } = await execa('git', ['branch', '--show-current']);
      const branch = stdout.trim();
      if (branch && branch !== 'HEAD') return branch;
    } catch {
      // Ignore and try fallback
    }

    // Attempt 2: Fallback for older git versions or detached HEAD
    try {
      const { stdout: fallback } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
      const finalBranch = fallback.trim();
      return finalBranch === 'HEAD' ? 'detached' : finalBranch;
    } catch {
      return 'main';
    }
  }

  async getDiff(options: DiffOptions): Promise<string> {
    const { mode, baseBranch = 'main' } = options;

    try {
      if (mode === 'staged') {
        const { stdout } = await execa('git', ['diff', '--cached']);
        return stdout;
      }

      if (mode === 'branch') {
        const { stdout } = await execa('git', ['diff', `${baseBranch}...HEAD`]);
        return stdout;
      }
    } catch {
      return '';
    }

    // Auto logic
    const staged = await this.getDiff({ mode: 'staged' });
    if (staged) return staged;

    const currentBranch = await this.getCurrentBranch();
    if (currentBranch !== baseBranch && currentBranch !== 'detached') {
      const branchDiff = await this.getDiff({ baseBranch, mode: 'branch' });
      if (branchDiff) return branchDiff;
    }

    try {
      // Check if we have at least one commit
      const { stdout: count } = await execa('git', ['rev-list', '--count', 'HEAD']);
      if (parseInt(count.trim()) > 0) {
        // If only 1 commit, diff against empty tree
        if (parseInt(count.trim()) === 1) {
          const { stdout: firstCommit } = await execa('git', ['diff', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', 'HEAD']);
          return firstCommit;
        }
        const { stdout: lastCommit } = await execa('git', ['diff', 'HEAD~1..HEAD']);
        return lastCommit;
      }
      return '';
    } catch {
      return '';
    }
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
    await execa('git', ['commit', '-m', message]);
  }
}
