import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
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
import { formatDuration, getCleanThoughts, useAIGenerator } from '../hooks/useAIGenerator.js';
import { useClipboard } from '../hooks/useClipboard.js';
import { useLoadingMessages } from '../hooks/useLoadingMessages.js';
import { useTerminalDimensions } from '../hooks/useTerminalDimensions.js';

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
  const { width, height } = useTerminalDimensions();

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
    durationMs,
  } = useAIGenerator({
    action: 'pr',
    config,
    diff,
    diffPath,
    metadata,
    prompt,
    provider: aiProvider,
    setGlobalLoading: setLoading,
  });

  const loadingText = useLoadingMessages('pr', internalLoading || dataLoading, { branch });
  const { copy, copied } = useClipboard();

  const loadData = useCallback(async () => {
    setDataLoading(true);
    // Parallelize git info, branch, diff loading, and AI pre-warming
    const prewarmTask = aiProvider.prewarm ? aiProvider.prewarm() : Promise.resolve();

    try {
      const [info, currentBranch, diffData] = await Promise.all([
        gitService.getProjectInfo(),
        gitService.getCurrentBranch(),
        gitService.getDiff({
          baseBranch: config.baseBranch,
          mode: 'auto',
        }),
        prewarmTask,
      ]);

      setBranch(currentBranch);
      setDiff(diffData.diff);

      if (!diffData.diff) {
        setError('No changes found for PR. Compare with base branch.');
        setDataLoading(false);
        return;
      }

      // Save to temp file
      const path = await gitService.saveDiffToTempFile(diffData.diff);
      setDiffPath(path);

      const promptOptions = {
        customInstructions: config.customInstructions,
        projectContext: info ? `${info.name} at ${info.path}` : undefined,
      };

      const template = await gitService.getPRTemplate();
      const p = template ? PROMPTS.PR_WITH_TEMPLATE(template, path, promptOptions) : PROMPTS.PR_NO_TEMPLATE(path, promptOptions);
      setPrompt(p);

      // Check cache
      const cached = cacheManager.get('pr');
      if (cached && cached.diffHash === cacheManager.generateDiffHash(diffData.diff)) {
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
  const showHeader = height > 15;
  const showSecondaryInfo = width > 70 && height > 20;

  // Responsive sizing
  const contentWidth = Math.max(width - (width > 50 ? 8 : 2), 20);
  const boxHeight = Math.max(height - (showHeader ? 16 : 10), 5);

  return (
    <Box flexDirection='column' height='100%'>
      {showHeader && <Header />}

      {internalLoading && !prContent && (
        <Box alignItems='center' flexDirection='column' flexGrow={1} justifyContent='center'>
          {!thought && (
            <Text color='cyan'>
              <Spinner type='dots' /> {loadingText}
            </Text>
          )}
          {thought && (
            <Box borderColor='blue' borderStyle='single' flexDirection='column' paddingX={2} paddingY={1} width={contentWidth}>
              <Text bold color='blue'>
                AGENT PROGRESS
              </Text>
              <Box flexDirection='column' marginTop={1}>
                {(() => {
                  const items = getCleanThoughts(thought);
                  if (items.length === 0) {
                    return (
                      <Text color='cyan'>
                        <Spinner type='dots' /> Thinking...
                      </Text>
                    );
                  }
                  return (
                    <Box flexDirection='column'>
                      {items.slice(-7).map((item, index) => (
                        <Text color='yellow' key={index}>
                          • {item}
                        </Text>
                      ))}
                    </Box>
                  );
                })()}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {showResult && (
        <Box flexDirection='column' flexGrow={1}>
          <Box justifyContent='space-between' marginBottom={1} paddingX={1} width={contentWidth}>
            <Box gap={1}>
              <Text bold color='blue'>
                AI PR Assistant
              </Text>
              {Boolean(showSecondaryInfo && lastMetadata?.branch) && (
                <Text color='gray' dimColor italic>
                  (for {lastMetadata?.branch as string})
                </Text>
              )}
            </Box>
            {Boolean(showSecondaryInfo && lastGeneratedAt) && (
              <Text color='gray' dimColor italic>
                {isCached ? 'Cached' : `New${durationMs ? ` (${formatDuration(durationMs)})` : ''}`} ·{' '}
                {new Date(lastGeneratedAt!).toLocaleTimeString()}
              </Text>
            )}
          </Box>

          <Box flexDirection='column' flexGrow={1} gap={1}>
            {/* PR Content - Full Width */}
            <Box flexDirection='column' flexGrow={1} width={contentWidth}>
              {editing ? (
                <Box borderColor='blue' borderStyle='round' flexDirection='column' flexGrow={1} paddingX={1} width={contentWidth}>
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
                  maxHeight={boxHeight}
                  title='PR Description'
                  titleColor='cyan'
                  width={contentWidth}
                />
              )}
              {internalLoading && height > 18 && (
                <Box flexDirection='column' marginTop={1} paddingX={1}>
                  <Text color='yellow'>
                    <Spinner type='dots' /> {thought ? 'Thinking...' : 'Streaming...'}
                  </Text>
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
        <Box flexWrap='wrap' gap={width > 60 ? 2 : 1} justifyContent='center' marginTop={1} width='100%'>
          <Text bold color='yellow'>
            [e] Edit
          </Text>
          <Text bold color='cyan'>
            [c] {copied ? 'Done' : 'Copy'}
          </Text>
          <Text bold color='magenta'>
            [r] Retry
          </Text>
          <Text bold color='gray'>
            [esc] Back
          </Text>
        </Box>
      )}

      {editing && (
        <Box justifyContent='center' marginTop={1}>
          <Text color='yellow'>Press [Enter] to save changes.</Text>
        </Box>
      )}
    </Box>
  );
};
