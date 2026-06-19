import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { cleanRawThought, Logger } from '../src/core/logger.js';

vi.mock('node:fs/promises');
vi.mock('../src/core/paths.js', () => ({
  paths: {
    getLogsDir: () => '/mock/logs',
  },
}));

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cleanRawThought', () => {
    it('should return original thought if not Codex', () => {
      const thought = 'some thought\ncodex\nsome other response';
      expect(cleanRawThought(thought, false)).toBe(thought);
    });

    it('should return empty string if Codex thought matches response only without tools', () => {
      const thought = 'Hi bob\nfeat(core): include file summary in promptstokens used\n10,348\n';
      expect(cleanRawThought(thought, true)).toBe('');
    });

    it('should preserve actual tool runs and strip final response for Codex', () => {
      const thought =
        'I’m reading the provided diff file directly... exec\ncat /var/folders/...\n succeeded\ncodex\nHi bob\n\n## Description\n...tokens used\n3,967\n';
      const expected = 'I’m reading the provided diff file directly... exec\ncat /var/folders/...\n succeeded';
      expect(cleanRawThought(thought, true)).toBe(expected);
    });
  });

  it('should log an action to a JSON file and summary', async () => {
    const logger = new Logger();
    const entry = {
      action: 'test-action',
      prompt: 'test-prompt',
      response: 'test-response',
      status: 'success' as const,
    };

    await logger.logAction(entry);

    expect(fs.mkdir).toHaveBeenCalledWith(path.join('/mock/logs', 'test-action'), { recursive: true });
    expect(fs.writeFile).toHaveBeenCalled();
    expect(fs.appendFile).toHaveBeenCalled();
  });

  it('should deduplicate consecutive identical errors', async () => {
    const logger = new Logger();
    const errorEntry = {
      action: 'test-error',
      error: 'Something went wrong',
      prompt: 'N/A',
      response: '',
      status: 'error' as const,
    };

    await logger.logAction(errorEntry);
    await logger.logAction(errorEntry);

    // Only called once for mkdir, writeFile, appendFile due to deduplication
    expect(fs.mkdir).toHaveBeenCalledTimes(1);
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    expect(fs.appendFile).toHaveBeenCalledTimes(1);
  });

  it('should log different errors normally', async () => {
    const logger = new Logger();

    await logger.logAction({
      action: 'error-1',
      error: 'Error 1',
      prompt: 'N/A',
      response: '',
      status: 'error',
    });

    await logger.logAction({
      action: 'error-2',
      error: 'Error 2',
      prompt: 'N/A',
      response: '',
      status: 'error',
    });

    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });
});
