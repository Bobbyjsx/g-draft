import { AntigravityProvider } from './antigravity.js';
import { ClaudeProvider } from './claude.js';
import { CodexProvider } from './codex.js';
import { GeminiProvider } from './gemini.js';
import { KiroProvider } from './kiro.js';
import type { AIProvider } from './types.js';

export * from './antigravity.js';
export * from './base.js';
export * from './claude.js';
export * from './codex.js';
export * from './engines.js';
export * from './gemini.js';
export * from './kiro.js';
export * from './types.js';

let geminiInstance: GeminiProvider | null = null;

export function getProvider(name: string): AIProvider {
  switch (name) {
    case 'antigravity':
      return new AntigravityProvider();
    case 'gemini':
      if (!geminiInstance) geminiInstance = new GeminiProvider();
      return geminiInstance;
    case 'claude':
      return new ClaudeProvider();
    case 'codex':
      return new CodexProvider();
    case 'kiro':
      return new KiroProvider();
    default:
      return new AntigravityProvider();
  }
}

export const ALL_PROVIDERS = [
  getProvider('antigravity'),
  getProvider('gemini'),
  getProvider('claude'),
  getProvider('codex'),
  getProvider('kiro'),
];
