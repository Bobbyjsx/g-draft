import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { cacheManager } from '../../core/cache.js';
import type { Config } from '../../core/config.js';
import type { GitService } from '../../core/git.js';
import { PROMPTS } from '../../core/prompts.js';
import { getProvider } from '../../providers/index.js';
import { ErrorScreen } from '../components/ErrorScreen.js';
import { Header } from '../components/Header.js';
import { ScrollableBox } from '../components/ScrollableBox.js';
import { useAIGenerator } from '../hooks/useAIGenerator.js';
import { useClipboard } from '../hooks/useClipboard.js';
import { useLoadingMessages } from '../hooks/useLoadingMessages.js';

interface ReviewScreenProps {
  gitService: GitService;
  config: Config;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ gitService, config, onBack, setLoading }) => {
  const [diff, setDiff] = useState<string>('');
  const [isCached, setIsCached] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const provider = useMemo(() => getProvider(config.provider), [config.provider]);
  const prompt = useMemo(() => (diff ? PROMPTS.REVIEW(diff) : ''), [diff]);

  const {
    generate,
    loading: internalLoading,
    error,
    result: review,
    setResult: setReview,
    setError,
    lastGeneratedAt,
    setLastGeneratedAt,
  } = useAIGenerator({
    action: 'review',
    diff,
    prompt,
    provider,
    setGlobalLoading: setLoading,
  });

  const loadingText = useLoadingMessages('review', internalLoading || dataLoading);
  const { copy, copied } = useClipboard();
  const { stdout } = useStdout();

  const loadDiff = useCallback(async () => {
    setDataLoading(true);
    try {
      const d = await gitService.getDiff({
        baseBranch: config.baseBranch,
        mode: 'auto',
      });
      if (!d) {
        setError('No changes found to review.');
        setDataLoading(false);
        return;
      }
      setDiff(d);

      // Check cache
      const cached = cacheManager.get('review');
      if (cached && cached.diffHash === cacheManager.generateDiffHash(d)) {
        setReview(cached.content);
        setLastGeneratedAt(cached.timestamp);
        setIsCached(true);
      }
    } catch (e: any) {
      setError(e.message || 'Error loading diff');
    } finally {
      setDataLoading(false);
    }
  }, [config.baseBranch, gitService, setError, setReview, setLastGeneratedAt]);

  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  useEffect(() => {
    if (diff && !review && !internalLoading && !error && !isCached && !dataLoading) {
      generate();
    }
  }, [diff, review, internalLoading, error, generate, isCached, dataLoading]);

  useInput((input, _key) => {
    if (internalLoading || dataLoading) return;
    if (input === 'r') {
      setIsCached(false);
      generate();
    }
    if (input === 'c') copy(review);
  });

  if (error) {
    return (
      <ErrorScreen
        error={error}
        onQuit={() => process.exit()}
        onRetry={() => {
          setError(null);
          if (!diff) loadDiff();
          else generate();
        }}
      />
    );
  }

  const isActuallyLoading = internalLoading || dataLoading || (diff && !review && !error);

  return (
    <Box flexDirection='column' gap={1} height='100%'>
      <Header />

      {isActuallyLoading ? (
        <Box alignItems='center' flexDirection='column' flexGrow={1} justifyContent='center'>
          <Text color='cyan'>
            <Spinner type='dots' /> {loadingText}
          </Text>
        </Box>
      ) : (
        <Box flexDirection='column' flexGrow={1}>
          <Box justifyContent='space-between' marginBottom={1} paddingX={1} width='100%'>
            <Text bold color='magenta'>
              AI Review Results
            </Text>
            {lastGeneratedAt && (
              <Text color='gray' dimColor italic>
                {isCached ? 'Loaded from cache' : 'Generated'} at {new Date(lastGeneratedAt).toLocaleTimeString()}
              </Text>
            )}
          </Box>
          <ScrollableBox
            borderColor='magenta'
            content={review}
            maxHeight={(stdout?.rows || 20) - 10}
            title='Audit Report'
            titleColor='magenta'
            width={(stdout?.columns || 80) - 4}
          />
        </Box>
      )}

      {!isActuallyLoading && (
        <Box gap={2} justifyContent='center' marginTop={1}>
          <Text bold color='cyan'>
            [c] {copied ? 'Copied!' : 'Copy'}
          </Text>
          <Text bold color='magenta'>
            [r] Rerun Review
          </Text>
          <Text bold color='gray'>
            [esc] Back
          </Text>
        </Box>
      )}
    </Box>
  );
};
