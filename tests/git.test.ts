import { execa } from 'execa';
import { describe, expect, it, vi } from 'vitest';
import { GitService } from '../src/core/git.js';

vi.mock('execa');

describe('GitService', () => {
  it('should identify a git repository', async () => {
    const gitService = new GitService();
    (vi.mocked(execa) as any).mockResolvedValueOnce({ stdout: 'true' });

    const isRepo = await gitService.isRepo();
    expect(isRepo).toBe(true);
    expect(execa).toHaveBeenCalledWith('git', ['--no-pager', 'rev-parse', '--is-inside-work-tree']);
  });

  it('should get the current branch name using branch --show-current', async () => {
    const gitService = new GitService();
    (vi.mocked(execa) as any).mockResolvedValueOnce({ stdout: 'main' });

    const branch = await gitService.getCurrentBranch();
    expect(branch).toBe('main');
    expect(execa).toHaveBeenCalledWith('git', ['--no-pager', 'branch', '--show-current']);
  });

  it('should fallback to rev-parse if branch --show-current fails', async () => {
    const gitService = new GitService();
    (vi.mocked(execa) as any).mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce({ stdout: 'legacy-branch' });

    const branch = await gitService.getCurrentBranch();
    expect(branch).toBe('legacy-branch');
    expect(execa).toHaveBeenCalledWith('git', ['--no-pager', 'rev-parse', '--abbrev-ref', 'HEAD']);
  });

  it('should get staged diff', async () => {
    const gitService = new GitService();
    (vi.mocked(execa) as any).mockResolvedValueOnce({ stdout: 'staged changes' });

    const result = await gitService.getDiff({ mode: 'staged' });
    expect(result.diff).toBe('staged changes');
    expect(result.command).toBe('git --no-pager diff --cached');
    expect(execa).toHaveBeenCalledWith('git', ['--no-pager', 'diff', '--cached']);
  });

  it('should get branch diff using merge-base', async () => {
    const gitService = new GitService();
    (vi.mocked(execa) as any)
      .mockResolvedValueOnce({ stdout: 'merge-base-hash' })
      .mockResolvedValueOnce({ stdout: 'branch changes' });

    const result = await gitService.getDiff({ baseBranch: 'main', mode: 'branch' });
    expect(result.diff).toBe('branch changes');
    expect(result.command).toBe('git --no-pager merge-base main HEAD && git --no-pager diff merge-base-hash');
    expect(execa).toHaveBeenCalledWith('git', ['--no-pager', 'merge-base', 'main', 'HEAD']);
    expect(execa).toHaveBeenCalledWith('git', ['--no-pager', 'diff', 'merge-base-hash']);
  });
});
