import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { cacheManager } from '../../core/cache.js';
import type { Config } from '../../core/config.js';
import type { GitService } from '../../core/git.js';
import { PROMPTS } from '../../core/prompts.js';
import type { AIProvider } from '../../providers/index.js';
import { ErrorScreen } from '../components/ErrorScreen.js';
import { Header } from '../components/Header.js';
import { ScrollableBox } from '../components/ScrollableBox.js';
import { useAIGenerator } from '../hooks/useAIGenerator.js';
import { useClipboard } from '../hooks/useClipboard.js';
import { useLoadingMessages } from '../hooks/useLoadingMessages.js';

interface ReviewScreenProps {
  gitService: GitService;
  config: Config;
  aiProvider: AIProvider;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ gitService, config, aiProvider, onBack, setLoading }) => {
  const [diff, setDiff] = useState<string>('');
  const [diffPath, setDiffPath] = useState<string>('');
  const [projectInfo, setProjectInfo] = useState<{ id: string; name: string; path: string } | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

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
    provider: aiProvider,
    setGlobalLoading: setLoading,
  });

  const loadingText = useLoadingMessages('review', internalLoading || dataLoading);
  const { copy, copied } = useClipboard();
  const { stdout } = useStdout();
  const _width = stdout?.columns || 80;

  const loadData = useCallback(async () => {
    setDataLoading(true);
    // Parallelize git info, diff loading, and AI pre-warming
    const prewarmTask = aiProvider.prewarm ? aiProvider.prewarm('auto-gemini-3') : Promise.resolve();

    try {
      const [info, diffResult] = await Promise.all([
        gitService.getProjectInfo(),
        gitService.getDiff({
          baseBranch: config.baseBranch,
          mode: 'auto',
        }),
        prewarmTask,
      ]);

      setProjectInfo(info);

      const { diff: d } = diffResult;
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
  }, [config.baseBranch, gitService, aiProvider, setError, setReview, setLastGeneratedAt, setHasAttempted]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          if (!diff) loadData();
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
          {!thought && (
            <Text color='cyan'>
              <Spinner type='dots' /> {loadingText}
            </Text>
          )}
          {thought && (
            <Box borderColor='magenta' borderStyle='single' flexDirection='column' paddingX={2} paddingY={1} width='80%'>
              <Text bold color='magenta'>
                AGENT PROGRESS
              </Text>
              <Box marginTop={1}>
                <ScrollableBox autoScroll content={thought} maxHeight={8} width={Math.floor(_width * 0.8) - 4} />
              </Box>
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
            <Box flexDirection='column' marginTop={1} paddingX={1}>
              <Text color='yellow'>
                <Spinner type='dots' /> {thought ? 'Thinking/Acting...' : 'Streaming...'}
              </Text>
              {thought && (
                <Box marginTop={1}>
                  <Text color='gray' dimColor italic>
                    Latest:{' '}
                    {thought
                      .split('\n')
                      .filter(Boolean)
                      .pop()
                      ?.slice(0, (stdout?.columns || 80) - 20)}
                  </Text>
                </Box>
              )}
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
