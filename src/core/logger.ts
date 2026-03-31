import path from 'node:path';
import { paths } from './paths.js';
import fs from 'node:fs/promises';

export interface LogEntry {
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  prompt: string;
  response: string;
  error?: string;
  diffCommand?: string;
}

export class Logger {
  private getLogsDir(): string {
    return paths.getLogsDir();
  }

  async logAction(entry: Omit<LogEntry, 'timestamp'>) {
    const fullEntry: LogEntry = {
      ...entry,
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
    } catch (e) {
      // Silent fail for logging
    }
  }
}

export const logger = new Logger();
