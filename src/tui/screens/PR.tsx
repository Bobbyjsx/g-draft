import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
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

interface PRScreenProps {
  gitService: GitService;
  config: Config;
  aiProvider: AIProvider;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export const PRScreen: React.FC<PRScreenProps> = ({ gitService, config, aiProvider, setLoading }) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [diff, setDiff] = useState<string>('');
  const [diffPath, setDiffPath] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isCached, setIsCached] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const metadata = useMemo(() => ({ branch }), [branch]);

  const {
    generate,
    loading: internalLoading,
    error,
    result: prContent,
    thought,
    setResult: setPrContent,
    setError,
    hasAttempted,
    setHasAttempted,
    lastGeneratedAt,
    setLastGeneratedAt,
    lastMetadata,
    setLastMetadata,
  } = useAIGenerator({
    action: 'pr',
    diff,
    diffPath,
    metadata,
    prompt,
    provider: aiProvider,
    setGlobalLoading: setLoading,
  });

  const loadingText = useLoadingMessages('pr', internalLoading || dataLoading, { branch });
  const { copy, copied } = useClipboard();
  const { stdout } = useStdout();
  const _width = stdout?.columns || 80;

  const loadData = useCallback(async () => {
    setDataLoading(true);
    // Parallelize git info, branch, diff loading, and AI pre-warming
    const prewarmTask = aiProvider.prewarm ? aiProvider.prewarm('gemini-3-flash') : Promise.resolve();

    try {
      const [info, currentBranch, diffResult] = await Promise.all([
        gitService.getProjectInfo(),
        gitService.getCurrentBranch(),
        gitService.getDiff({
          baseBranch: config.baseBranch,
          mode: 'auto',
        }),
        prewarmTask,
      ]);

      setBranch(currentBranch);

      const { diff: d } = diffResult;
      if (!d) {
        setError('No changes found for PR. Compare with base branch.');
        setDataLoading(false);
        return;
      }
      setDiff(d);

      // Save to temp file
      const path = await gitService.saveDiffToTempFile(d);
      setDiffPath(path);

      const promptOptions = {
        customInstructions: config.customInstructions,
        projectContext: info ? `${info.name} at ${info.path}` : undefined,
      };

      const template = await gitService.getPRTemplate();
      const p = template ? PROMPTS.PR_WITH_TEMPLATE(template, d, promptOptions) : PROMPTS.PR_NO_TEMPLATE(d, promptOptions);
      setPrompt(p);

      // Check cache
      const cached = cacheManager.get('pr');
      if (cached && cached.diffHash === cacheManager.generateDiffHash(d)) {
        setPrContent(cached.content);
        setLastGeneratedAt(cached.timestamp);
        setLastMetadata(cached.metadata ?? null);
        setIsCached(true);
        setHasAttempted(true);
      }
    } catch (e: any) {
      setError(e.message || 'Error loading PR data');
    } finally {
      setDataLoading(false);
    }
  }, [
    config.baseBranch,
    gitService,
    aiProvider,
    setError,
    setPrContent,
    setLastGeneratedAt,
    setLastMetadata,
    setHasAttempted,
    config.customInstructions,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (prompt && !prContent && !internalLoading && !error && !isCached && !dataLoading && !hasAttempted) {
      generate();
    }
  }, [prompt, prContent, internalLoading, error, generate, isCached, dataLoading, hasAttempted]);

  useInput((input, _key) => {
    if (internalLoading || dataLoading || editing) return;
    if (input === 'r') {
      setIsCached(false);
      generate();
    }
    if (input === 'e') setEditing(true);
    if (input === 'c') copy(prContent);
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

  const isActuallyLoading = internalLoading || dataLoading || (diff && !prContent && !error);
  const showResult = !!prContent || (editing && !isActuallyLoading);

  return (
    <Box flexDirection='column' height='100%'>
      <Header />

      {internalLoading && !prContent && (
        <Box alignItems='center' flexDirection='column' flexGrow={1} justifyContent='center'>
          {!thought && (
            <Text color='cyan'>
              <Spinner type='dots' /> {loadingText}
            </Text>
          )}
          {thought && (
            <Box borderColor='blue' borderStyle='single' flexDirection='column' paddingX={2} paddingY={1} width='80%'>
              <Text bold color='blue'>
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
            <Box gap={1}>
              <Text bold color='blue'>
                AI PR Assistant
              </Text>
              {Boolean(lastMetadata?.branch) && (
                <Text color='gray' dimColor italic>
                  (for {lastMetadata?.branch as string})
                </Text>
              )}
            </Box>
            {lastGeneratedAt && (
              <Text color='gray' dimColor italic>
                {isCached ? 'Loaded from cache' : 'Generated'} at {new Date(lastGeneratedAt).toLocaleTimeString()}
              </Text>
            )}
          </Box>

          <Box flexDirection='column' flexGrow={1} gap={1}>
            {/* PR Content - Full Width */}
            <Box flexDirection='column' flexGrow={1} width='100%'>
              {editing ? (
                <Box borderColor='blue' borderStyle='round' flexDirection='column' flexGrow={1} paddingX={1}>
                  <Text bold color='cyan'>
                    PR Description (Editing)
                  </Text>
                  <Box flexGrow={1} overflow='hidden'>
                    <TextInput onChange={setPrContent} onSubmit={() => setEditing(false)} value={prContent} />
                  </Box>
                </Box>
              ) : (
                <ScrollableBox
                  borderColor='blue'
                  content={prContent}
                  maxHeight={(stdout?.rows || 20) - 10}
                  title='PR Description'
                  titleColor='cyan'
                  width={(stdout?.columns || 80) - 4}
                />
              )}
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
          </Box>
        </Box>
      )}

      {dataLoading && !prContent && (
        <Box alignItems='center' flexDirection='column' flexGrow={1} justifyContent='center'>
          <Text color='cyan'>
            <Spinner type='dots' /> Loading data...
          </Text>
        </Box>
      )}

      {!internalLoading && !dataLoading && !editing && (
        <Box gap={2} justifyContent='center' marginTop={1}>
          <Text bold color='yellow'>
            [e] Edit Description
          </Text>
          <Text bold color='cyan'>
            [c] {copied ? 'Copied!' : 'Copy'}
          </Text>
          <Text bold color='magenta'>
            [r] Retry Generation
          </Text>
          <Text bold color='gray'>
            [esc] Back
          </Text>
        </Box>
      )}

      {editing && (
        <Box justifyContent='center' marginTop={1}>
          <Text color='yellow'>Editing PR description... Press [Enter] to save.</Text>
        </Box>
      )}
    </Box>
  );
};
