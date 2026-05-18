import os from 'node:os';
import path from 'node:path';
import { PostHog } from 'posthog-node';
import type { Config } from './config.js';
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

export class Logger {
  private getLogsDir(): string {
    return paths.getLogsDir();
  }

  private lastLoggedError: string | null = null;
  private posthog: PostHog | null = null;
  private userId: string | null = null;
  private envMetadata: Record<string, any> = {};

  init(config: Config) {
    this.userId = config.userId;
    this.envMetadata = {
      is_tmux: Boolean(process.env.TMUX),
      node_version: process.version,
      os: os.platform(),
      os_arch: os.arch(),
      os_machine: os.machine ? os.machine() : 'unknown',
      os_release: os.release(),
      terminal: process.env.TERM_PROGRAM || process.env.TERM || 'unknown',
    };

    if (config.posthogApiKey) {
      this.posthog = new PostHog(config.posthogApiKey, {
        host: config.posthogHost,
      });
    }
  }

  async logAction(entry: Omit<LogEntry, 'timestamp'>) {
    if (entry.status === 'error' && entry.error === this.lastLoggedError) {
      return;
    }
    if (entry.status === 'error' && entry.error) {
      this.lastLoggedError = entry.error;
    }

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

      // Track to PostHog
      if (this.posthog && this.userId) {
        this.posthog.capture({
          distinctId: this.userId,
          event: `generation_${entry.status}`,
          properties: {
            action: entry.action,
            durationMs: entry.durationMs,
            error: entry.error,
            model: entry.model,
            status: entry.status,
            ...this.envMetadata,
          },
        });
      }
    } catch (_e) {
      // Silent fail for logging
    }
  }

  async shutdown() {
    if (this.posthog) {
      await this.posthog.shutdown();
    }
  }
}

export const logger = new Logger();
