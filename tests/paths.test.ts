import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PathManager } from '../src/core/paths.js';

describe('PathManager', () => {
  const paths = new PathManager();

  it('should generate a consistent 12-character project ID based on path', () => {
    const cwd = process.cwd();
    const id1 = paths.getProjectId(cwd);
    const id2 = paths.getProjectId(cwd);
    const id3 = paths.getProjectId(path.join(cwd, 'subdir'));

    expect(id1).toHaveLength(12);
    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
  });

  it('should return a project directory containing the ID', () => {
    const cwd = process.cwd();
    const id = paths.getProjectId(cwd);
    const dir = paths.getProjectDir(cwd);

    expect(dir).toContain(id);
  });
});
