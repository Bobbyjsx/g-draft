import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { Logger } from '../src/core/logger.js';

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
