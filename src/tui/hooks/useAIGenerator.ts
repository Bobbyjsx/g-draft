import { useCallback, useEffect, useState } from 'react';
import fs from 'node:fs';
import { type CacheAction, cacheManager } from '../../core/cache.js';
import type { Config } from '../../core/config.js';
import { cleanRawThought, logger } from '../../core/logger.js';
import { PROMPTS } from '../../core/prompts.js';
import type { AIProvider } from '../../providers/index.js';

interface UseAIGeneratorOptions {
  action: CacheAction;
  provider: AIProvider;
  prompt: string;
  diff?: string;
  diffPath?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (response: string, metadata?: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  setGlobalLoading: (loading: boolean) => void;
  config?: Config;
}

const SUMMARIZATION_THRESHOLD = 30000;
const _MAX_SUMMARY_CONTEXT = 50000;
const FALLBACK_CONTEXT_LIMIT = 5000;

export const useAIGenerator = ({
  action,
  provider,
  prompt,
  diff,
  diffPath,
  metadata,
  onSuccess,
  onError,
  setGlobalLoading,
  config,
}: UseAIGeneratorOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [thought, setThought] = useState<string>('');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<Record<string, unknown> | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    return () => {
      if (provider.dispose) {
        provider.dispose().catch(() => {});
      }
      if (diffPath && fs.existsSync(diffPath)) {
        try {
          fs.unlinkSync(diffPath);
        } catch (_e) {}
      }
    };
  }, [provider, diffPath]);

  const generate = useCallback(async () => {
    if (!prompt) return;

    setLoading(true);
    setGlobalLoading(true);
    setError(null);
    setResult('');
    setThought('');
    setDurationMs(null);
    setHasAttempted(true);

    const startTime = Date.now();
    let fullResponse = '';
    let fullThought = '';
    let streamError: string | null = null;

    let finalPrompt = prompt;

    // Smart Diff: If the prompt is massive, perform a summarization pass first
    if (config?.enableSummary && prompt.length > SUMMARIZATION_THRESHOLD) {
      setLoading(true);
      setThought('Diff is large. Performing technical pre-analysis... \n');
      try {
        const summaryPrompt = PROMPTS.SUMMARIZE(diffPath || '');
        const summary = await provider.run(
          summaryPrompt,
          {
            onThought: (t: string) => setThought((prev) => prev + t),
          },
          PROMPTS.SYSTEM
        );

        // Robustly replace the massive diff with the concise summary
        if (diff && prompt.includes(diff)) {
          finalPrompt = prompt.replace(
            diff,
            `[TECHNICAL SUMMARY OF CHANGES]:\n${summary}\n\n(Original large diff omitted for context efficiency)`
          );
        } else {
          // Fallback: Prepend the summary and keep as much as possible
          finalPrompt = `[TECHNICAL SUMMARY OF CHANGES]:\n${summary}\n\n${prompt.slice(0, FALLBACK_CONTEXT_LIMIT)}`;
        }

        // Add a separator for the final pass
        setThought((prev) => `${prev}\nPre-analysis complete. Generating final response...\n`);
      } catch (_e: any) {
        // Fallback to original prompt if summarization fails (unless it was a disposal)
        if (_e.message !== 'AI Provider disposed during request') {
          setThought((prev) => `${prev}\nPre-analysis failed. Falling back to full diff...\n`);
        } else {
          return; // Stop if disposed
        }
      }
    }

    const decoratedPrompt = provider.decoratePrompt ? provider.decoratePrompt(finalPrompt) : finalPrompt;

    try {
      if (!(await provider.isAvailable())) {
        throw new Error(`Provider ${provider.name} not found. ${provider.installGuide}`);
      }

      await provider.stream(
        decoratedPrompt,
        {
          onError: (err) => {
            streamError = err;
            setError(err);
          },
          onText: (text) => {
            fullResponse += text;
            let cleaned = fullResponse.trimStart();
            if (action === 'commit' || action === 'pr') {
              const startsWithBlock = /^```[a-zA-Z]*\n/.exec(cleaned);
              if (startsWithBlock) {
                cleaned = cleaned.slice(startsWithBlock[0].length);
                const endsWithBlock = /\n?```\s*$/.exec(cleaned);
                if (endsWithBlock) {
                  cleaned = cleaned.slice(0, cleaned.length - endsWithBlock[0].length);
                }
              }
            }
            if (action === 'commit') cleaned = cleaned.trim();
            setResult(cleaned);
          },
          onThought: (t) => {
            fullThought += t;
            setThought((prev) => prev + t);
          },
        },
        diffPath,
        false,
        PROMPTS.SYSTEM
      );

      if (streamError) {
        throw new Error(streamError);
      }

      setThought(cleanRawThought(fullThought, provider.name === 'codex'));
      setDurationMs(Date.now() - startTime);

      const timestamp = new Date().toISOString();
      setLastGeneratedAt(timestamp);
      setLastMetadata(metadata ?? null);

      let finalResponse = fullResponse.trimStart();
      if (action === 'commit' || action === 'pr') {
        const startsWithBlock = /^```[a-zA-Z]*\n/.exec(finalResponse);
        if (startsWithBlock) {
          finalResponse = finalResponse.slice(startsWithBlock[0].length);
          const endsWithBlock = /\n?```\s*$/.exec(finalResponse);
          if (endsWithBlock) {
            finalResponse = finalResponse.slice(0, finalResponse.length - endsWithBlock[0].length);
          }
        }
      }
      if (action === 'commit') finalResponse = finalResponse.trim();

      // Save to cache
      if (diff) {
        cacheManager.set(action, {
          content: finalResponse,
          diffHash: cacheManager.generateDiffHash(diff),
          metadata,
          timestamp,
        });
      }

      logger.logAction({
        action,
        durationMs: Date.now() - startTime,
        model: provider.getModel?.(),
        prompt: decoratedPrompt,
        response: finalResponse,
        status: 'success',
        thought: fullThought,
      });

      onSuccess?.(finalResponse, metadata);
    } catch (e: any) {
      // Ignore cancellation errors during shutdown
      if (e.message === 'AI Provider disposed during request') {
        return;
      }

      setThought(cleanRawThought(fullThought, provider.name === 'codex'));
      setDurationMs(null);

      const msg = e.message || `Error generating ${action}`;
      setError(msg);

      logger.logAction({
        action,
        durationMs: Date.now() - startTime,
        error: msg,
        model: provider.getModel?.(),
        prompt: decoratedPrompt,
        response: '',
        status: 'error',
        thought: fullThought,
      });

      onError?.(msg);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
      if (diffPath && fs.existsSync(diffPath)) {
        try {
          fs.unlinkSync(diffPath);
        } catch (_e) {}
      }
    }
  }, [action, provider, prompt, diff, diffPath, metadata, onSuccess, onError, setGlobalLoading, config]);

  return {
    durationMs,
    error,
    generate,
    hasAttempted,
    lastGeneratedAt,
    lastMetadata,
    loading,
    result,
    setError,
    setHasAttempted,
    setLastGeneratedAt,
    setLastMetadata,
    setResult,
    thought,
  };
};

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getCleanThoughts(thoughtStr: string): string[] {
  if (!thoughtStr) return [];

  // Remove `exec` followed by command lines
  // A lot of commands look like `.exec\n/bin/zsh ...` or `.exec\n`
  const cleaned = thoughtStr.replace(/\.exec\b/g, '.');

  const lines = cleaned.split('\n');
  const thoughts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Filter out command lines and execution metadata
    if (trimmed.startsWith('exec') || trimmed.startsWith('/') || trimmed.startsWith('Running command:')) {
      continue;
    }
    if (trimmed.includes('succeeded in') || trimmed.includes('failed in')) {
      continue;
    }
    // Filter out diff stat lines (e.g. " src/core/prompts.ts             |  12 +-")
    if (trimmed.includes('|') && (trimmed.includes('+-') || trimmed.includes('+') || trimmed.includes('-'))) {
      continue;
    }
    // Filter out file paths and terminal lines
    if (
      trimmed.startsWith('diff --git') ||
      trimmed.startsWith('index ') ||
      trimmed.startsWith('--- ') ||
      trimmed.startsWith('+++ ')
    ) {
      continue;
    }
    // Filter out diff hunk headers (e.g. "@@ -3,6 +3,7 @@")
    if (trimmed.startsWith('@@ ') && trimmed.endsWith(' @@')) {
      continue;
    }
    // Filter out lines of code (e.g. import, export, const, class, etc.)
    if (
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export ') ||
      trimmed.startsWith('const ') ||
      trimmed.startsWith('let ') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('function ') ||
      trimmed.startsWith('public ') ||
      trimmed.startsWith('private ') ||
      trimmed.startsWith('protected ')
    ) {
      continue;
    }
    // Filter out metadata
    if (trimmed.includes('tokens used') || trimmed.includes('tokens:')) {
      continue;
    }

    // Ignore lines that look like shell execution
    if (trimmed.startsWith('git ') || trimmed.startsWith('npm ') || trimmed.startsWith('node ')) {
      continue;
    }

    // Now, split into sentences to itemize them
    const sentences = trimmed.split(/(?<=\.|\?|!)\s+/);
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      // Ensure it starts with a letter and is not just punctuation/brackets
      if (/^[a-zA-Z'’"]/.test(cleanSentence) && cleanSentence.length > 5) {
        // Exclude sentences that contain typical shell or command words
        if (
          cleanSentence.includes('/bin/zsh') ||
          cleanSentence.includes('git diff') ||
          cleanSentence.includes('succeeded in') ||
          (cleanSentence.includes('succeeded') && cleanSentence.includes('ms'))
        ) {
          continue;
        }

        // Capitalize first letter
        const formatted = cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1);
        if (!thoughts.includes(formatted)) {
          thoughts.push(formatted);
        }
      }
    }
  }

  return thoughts;
}
