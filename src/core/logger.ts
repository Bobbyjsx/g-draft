import path from 'node:path';
import { paths } from './paths.js';
import fs from 'node:fs/promises';

export interface LogEntry {
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  prompt: string;
  response: string;
  thought?: string;
  error?: string;
  diffCommand?: string;
  durationMs?: number;
  model?: string;
}

export function cleanRawThought(thought: string, isCodex = false): string {
  if (!thought) return '';
  if (!isCodex) return thought;

  const blocks = thought.split(/\bcodex\b/i);
  const filteredBlocks: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isLast = i === blocks.length - 1;
    const hasToolExec =
      block.includes('exec') ||
      block.includes('Running command:') ||
      block.includes('succeeded in') ||
      block.includes('failed in');

    if (hasToolExec || !isLast) {
      filteredBlocks.push(block);
    }
  }

  return filteredBlocks.join('\n').trim();
}

export class Logger {
  private getLogsDir(): string {
    return paths.getLogsDir();
  }

  private lastLoggedError: string | null = null;

  async logAction(entry: Omit<LogEntry, 'timestamp'>) {
    if (entry.status === 'error' && entry.error === this.lastLoggedError) {
      return;
    }
    if (entry.status === 'error' && entry.error) {
      this.lastLoggedError = entry.error;
    }

    const isCodex = entry.model?.toLowerCase().includes('codex');
    const cleanedThought = entry.thought ? cleanRawThought(entry.thought, isCodex) : undefined;

    const fullEntry: LogEntry = {
      ...entry,
      thought: cleanedThought,
      timestamp: new Date().toISOString(),
    };

    const logsDir = this.getLogsDir();
    const actionDir = path.join(logsDir, entry.action);

    try {
      await fs.mkdir(actionDir, { recursive: true });

      const fileName = `${fullEntry.timestamp.replace(/[:.]/g, '-')}.json`;
      const filePath = path.join(actionDir, fileName);

      await fs.writeFile(filePath, JSON.stringify(fullEntry, null, 2), 'utf8');

      const summaryPath = path.join(logsDir, 'history.log');
      const summaryLine = `[${fullEntry.timestamp}] ACTION: ${fullEntry.action.toUpperCase()} | STATUS: ${fullEntry.status.toUpperCase()}\n`;
      await fs.appendFile(summaryPath, summaryLine, 'utf8');
    } catch (_e) {
      // Silent fail for logging
    }
  }
}

export const logger = new Logger();
