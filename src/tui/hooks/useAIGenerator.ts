import { useCallback, useState } from 'react';
import { type CacheAction, cacheManager } from '../../core/cache.js';
import { logger } from '../../core/logger.js';
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
}

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
}: UseAIGeneratorOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [thought, setThought] = useState<string>('');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<Record<string, unknown> | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  const generate = useCallback(async () => {
    if (!prompt) return;

    setLoading(true);
    setGlobalLoading(true);
    setError(null);
    setResult('');
    setThought('');
    setHasAttempted(true);

    let fullResponse = '';
    let fullThought = '';
    let streamError: string | null = null;

    try {
      if (!(await provider.isAvailable())) {
        throw new Error(`Provider ${provider.name} not found. ${provider.installGuide}`);
      }

      await provider.stream(
        prompt,
        {
          onError: (err) => {
            streamError = err;
            setError(err);
          },
          onText: (text) => {
            fullResponse += text;
            setResult((prev) => prev + text);
          },
          onThought: (t) => {
            fullThought += t;
            setThought((prev) => prev + t);
          },
        },
        diffPath
      );

      if (streamError) {
        throw new Error(streamError);
      }

      const timestamp = new Date().toISOString();
      setLastGeneratedAt(timestamp);
      setLastMetadata(metadata ?? null);

      // Save to cache
      if (diff) {
        cacheManager.set(action, {
          content: fullResponse,
          diffHash: cacheManager.generateDiffHash(diff),
          metadata,
          timestamp,
        });
      }

      logger.logAction({
        action,
        prompt,
        response: fullResponse,
        status: 'success',
        thought: fullThought,
      });

      onSuccess?.(fullResponse, metadata);
    } catch (e: any) {
      const msg = e.message || `Error generating ${action}`;
      setError(msg);

      logger.logAction({
        action,
        error: msg,
        prompt,
        response: '',
        status: 'error',
      });

      onError?.(msg);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [action, provider, prompt, diff, diffPath, metadata, onSuccess, onError, setGlobalLoading]);

  return {
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
