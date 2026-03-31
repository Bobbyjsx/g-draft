import { useCallback, useState } from 'react';
import { type CacheAction, cacheManager } from '../../core/cache.js';
import { logger } from '../../core/logger.js';
import type { AIProvider } from '../../providers/index.js';

interface UseAIGeneratorOptions {
  action: CacheAction;
  provider: AIProvider;
  prompt: string;
  diff?: string;
  onSuccess?: (response: string) => void;
  onError?: (error: string) => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useAIGenerator = ({
  action,
  provider,
  prompt,
  diff,
  onSuccess,
  onError,
  setGlobalLoading,
}: UseAIGeneratorOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

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

      // Save to cache
      if (diff) {
        cacheManager.set(action, {
          content: res,
          diffHash: cacheManager.generateDiffHash(diff),
          timestamp,
        });
      }

      logger.logAction({
        action,
        prompt,
        response: res,
        status: 'success',
      });

      onSuccess?.(res);
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
  }, [action, provider, prompt, diff, onSuccess, onError, setGlobalLoading]);

  return { error, generate, lastGeneratedAt, loading, result, setError, setLastGeneratedAt, setResult };
};
