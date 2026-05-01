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
  const [diffPath, setDiffPath] = useState<string>('');
  const [projectInfo, setProjectInfo] = useState<{ id: string; name: string; path: string } | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const provider = useMemo(() => getProvider(config.provider), [config.provider]);
  const promptOptions = useMemo(
    () => ({
      customInstructions: config.customInstructions,
      projectContext: projectInfo ? `${projectInfo.name} at ${projectInfo.path}` : undefined,
    }),
    [config.customInstructions, projectInfo]
  );

  const prompt = useMemo(() => (diff ? PROMPTS.REVIEW(diff, promptOptions) : ''), [diff, promptOptions]);

  const {
    generate,
    loading: internalLoading,
    error,
    result: review,
    thought,
    setResult: setReview,
    setError,
    hasAttempted,
    setHasAttempted,
    lastGeneratedAt,
    setLastGeneratedAt,
  } = useAIGenerator({
    action: 'review',
    diff,
    diffPath,
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
      const info = await gitService.getProjectInfo();
      setProjectInfo(info);

      const { diff: d } = await gitService.getDiff({
        baseBranch: config.baseBranch,
        mode: 'auto',
      });
      if (!d) {
        setError('No changes found to review.');
        setDataLoading(false);
        return;
      }
      setDiff(d);

      // Save to temp file
      const path = await gitService.saveDiffToTempFile(d);
      setDiffPath(path);

      // Check cache
      const cached = cacheManager.get('review');
      if (cached && cached.diffHash === cacheManager.generateDiffHash(d)) {
        setReview(cached.content);
        setLastGeneratedAt(cached.timestamp);
        setIsCached(true);
        setHasAttempted(true);
      }
    } catch (e: any) {
      setError(e.message || 'Error loading diff');
    } finally {
      setDataLoading(false);
    }
  }, [config.baseBranch, gitService, setError, setReview, setLastGeneratedAt, setHasAttempted]);

  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  useEffect(() => {
    if (diff && !review && !internalLoading && !error && !isCached && !dataLoading && !hasAttempted) {
      generate();
    }
  }, [diff, review, internalLoading, error, generate, isCached, dataLoading, hasAttempted]);

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

  const _isActuallyLoading = internalLoading || dataLoading || (diff && !review && !error);
  const showResult = !!review;

  return (
    <Box flexDirection='column' gap={1} height='100%'>
      <Header />

      {internalLoading && !review && (
        <Box alignItems='center' flexDirection='column' flexGrow={1} justifyContent='center'>
          <Text color='cyan'>
            <Spinner type='dots' /> {loadingText}
          </Text>
          {thought && (
            <Box marginTop={1}>
              <Text color='gray' italic>
                Thinking: {thought.length > 100 ? `${thought.slice(0, 100)}...` : thought}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {showResult && (
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
          {internalLoading && (
            <Box paddingX={1}>
              <Text color='yellow'>
                <Spinner type='dots' /> {thought ? 'Thinking...' : 'Streaming...'}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {dataLoading && !review && (
        <Box alignItems='center' flexDirection='column' flexGrow={1} justifyContent='center'>
          <Text color='cyan'>
            <Spinner type='dots' /> Loading data...
          </Text>
        </Box>
      )}

      {!internalLoading && !dataLoading && (
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
