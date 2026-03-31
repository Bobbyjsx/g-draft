import { useCallback, useState } from 'react';
import { type CacheAction, cacheManager } from '../../core/cache.js';
import { logger } from '../../core/logger.js';
import type { AIProvider } from '../../providers/index.js';

interface UseAIGeneratorOptions {
  action: CacheAction;
  provider: AIProvider;
  prompt: string;
  diff?: string;
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
  metadata,
  onSuccess,
  onError,
  setGlobalLoading,
}: UseAIGeneratorOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<Record<string, unknown> | null>(null);

  const generate = useCallback(async () => {
    if (!prompt) return;

    setLoading(true);
    setGlobalLoading(true);
    setError(null);

    try {
      if (!(await provider.isAvailable())) {
        throw new Error(`Provider ${provider.name} not found. ${provider.installGuide}`);
      }

      const res = await provider.run(prompt);
      setResult(res);

      const timestamp = new Date().toISOString();
      setLastGeneratedAt(timestamp);
      setLastMetadata(metadata ?? null);

      // Save to cache
      if (diff) {
        cacheManager.set(action, {
          content: res,
          diffHash: cacheManager.generateDiffHash(diff),
          metadata,
          timestamp,
        });
      }

      logger.logAction({
        action,
        prompt,
        response: res,
        status: 'success',
      });

      onSuccess?.(res, metadata);
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
  }, [action, provider, prompt, diff, metadata, onSuccess, onError, setGlobalLoading]);

  return {
    error,
    generate,
    lastGeneratedAt,
    lastMetadata,
    loading,
    result,
    setError,
    setLastGeneratedAt,
    setLastMetadata,
    setResult,
  };
};
