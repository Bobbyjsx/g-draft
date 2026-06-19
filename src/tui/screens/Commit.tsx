import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { cacheManager } from '../../core/cache.js';
import type { Config } from '../../core/config.js';
import { GitService } from '../../core/git.js';
import { PROMPTS } from '../../core/prompts.js';
import type { AIProvider } from '../../providers/index.js';
import { ErrorScreen } from '../components/ErrorScreen.js';
import { Header } from '../components/Header.js';
import { ScrollableBox } from '../components/ScrollableBox.js';
import { formatDuration, getCleanThoughts, useAIGenerator } from '../hooks/useAIGenerator.js';
import { useClipboard } from '../hooks/useClipboard.js';
import { useLoadingMessages } from '../hooks/useLoadingMessages.js';
import { useTerminalDimensions } from '../hooks/useTerminalDimensions.js';

interface CommitScreenProps {
  gitService: GitService;
  config: Config;
  aiProvider: AIProvider;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export const CommitScreen: React.FC<CommitScreenProps> = ({ gitService, config, aiProvider, onBack, setLoading }) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'committing' | 'done'>('idle');
  const [diff, setDiff] = useState<string>('');
  const [diffPath, setDiffPath] = useState<string>('');
  const [projectInfo, setProjectInfo] = useState<{ id: string; name: string; path: string } | null>(null);
  const [mode, setMode] = useState<string>('staged');
  const [isCached, setIsCached] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const { width, height } = useTerminalDimensions();

  const metadata = useMemo(() => ({ mode }), [mode]);
  const promptOptions = useMemo(
    () => ({
      customInstructions: config.customInstructions,
      projectContext: projectInfo ? `${projectInfo.name} at ${projectInfo.path}` : undefined,
    }),
    [config.customInstructions, projectInfo]
  );

  const prompt = useMemo(() => {
    if (!diffPath) return '';
    return PROMPTS.COMMIT(diffPath, promptOptions);
  }, [diffPath, promptOptions]);

  const {
    generate,
    loading: internalLoading,
    error,
    result: message,
    thought,
    setResult: setMessage,
    setError,
    hasAttempted,
    setHasAttempted,
    lastGeneratedAt,
    setLastGeneratedAt,
    lastMetadata,
    setLastMetadata,
    durationMs,
  } = useAIGenerator({
    action: 'commit',
    config,
    diff,
    diffPath,
    metadata,
    prompt,
    provider: aiProvider,
    setGlobalLoading: setLoading,
  });

  const loadingText = useLoadingMessages('commit', internalLoading || dataLoading, { mode });
  const { copy, copied } = useClipboard();

  const loadData = useCallback(async () => {
    setDataLoading(true);
    // Parallelize git info, diff loading, and AI pre-warming
    const prewarmTask = aiProvider.prewarm ? aiProvider.prewarm() : Promise.resolve();

    try {
      const [info, diffData] = await Promise.all([
        gitService.getProjectInfo(),
        gitService.getDiff({
          baseBranch: config.baseBranch,
          mode: 'auto',
        }),
        prewarmTask,
      ]);

      setProjectInfo(info);
      setDiff(diffData.diff);
      setMode(diffData.mode);

      if (!diffData.diff) {
        setError('No changes found. Stage some files first or ensure there are changes.');
        setDataLoading(false);
        return;
      }

      // Save to temp file for vendor processing
      const path = await gitService.saveDiffToTempFile(diffData.diff);
      setDiffPath(path);

      // Check cache
      const cached = cacheManager.get('commit');
      if (cached && cached.diffHash === cacheManager.generateDiffHash(diffData.diff)) {
        setMessage(cached.content);
        setLastGeneratedAt(cached.timestamp);
        setLastMetadata(cached.metadata ?? null);
        setIsCached(true);
        setHasAttempted(true);
      }
    } catch (e: any) {
      setError(e.message || 'Error loading diff');
    } finally {
      setDataLoading(false);
    }
  }, [gitService, aiProvider, setError, setMessage, setLastGeneratedAt, setLastMetadata, setHasAttempted, config.baseBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Only auto-generate if no cache was found and we haven't attempted yet
    if (diff && !message && !internalLoading && !error && !isCached && !dataLoading && !hasAttempted) {
      generate();
    }
  }, [diff, message, internalLoading, error, generate, isCached, dataLoading, hasAttempted]);

  useInput((input, _key) => {
    if (internalLoading || dataLoading || editing || status !== 'idle') return;

    if (input === 'r') {
      setIsCached(false);
      generate();
    }
    if (input === 'e') setEditing(true);
    if (input === 'a') handleCommit();
    if (input === 'c') copy(message);
  });

  const handleCommit = async () => {
    if (!message.trim()) {
      setError('Commit message cannot be empty.');
      return;
    }

    setStatus('committing');
    setLoading(true);
    try {
      await gitService.commit(message);
      setStatus('done');
      setLoading(false);
      cacheManager.clear('commit'); // Clear cache after successful commit
      setTimeout(() => onBack(), 1500);
    } catch (e: any) {
      setError(e.message || 'Error committing');
      setStatus('idle');
      setLoading(false);
    }
  };

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

  if (status === 'done') {
    return (
      <Box alignItems='center' flexDirection='column' height='100%' justifyContent='center'>
        <Header />
        <Box marginTop={2}>
          <Text bold color='green'>
            ✓ Successfully committed!
          </Text>
        </Box>
        <Text dimColor>Returning to dashboard...</Text>
      </Box>
    );
  }

  const isActuallyLoading = internalLoading || dataLoading || (diff && !message && !error);
  const showResult = !!message || (editing && !isActuallyLoading);
  const showHeader = height > 15;
  const showSecondaryInfo = width > 70 && height > 20;

  // Responsive sizing
  const contentWidth = Math.max(width - (width > 50 ? 8 : 2), 20);
  const boxHeight = Math.max(height - (showHeader ? 16 : 10), 5);

  return (
    <Box flexDirection='column' gap={showHeader ? 1 : 0} width='100%'>
      {showHeader && <Header />}

      <Box flexDirection='column' flexGrow={1} gap={1} width='100%'>
        <Box justifyContent='space-between' width={contentWidth}>
          <Box gap={1}>
            <Text bold color='cyan'>
              {editing ? 'Editing Message' : 'Generated Commit Message'}
            </Text>
            {Boolean(showSecondaryInfo && !dataLoading && lastMetadata?.mode) && (
              <Text color='gray' dimColor italic>
                ({GitService.formatMode(lastMetadata?.mode as string)})
              </Text>
            )}
          </Box>

          {Boolean(showSecondaryInfo && !dataLoading && lastGeneratedAt) && (
            <Text color='gray' dimColor italic>
              {isCached ? 'Cached' : `New${durationMs ? ` (${formatDuration(durationMs)})` : ''}`} ·{' '}
              {new Date(lastGeneratedAt!).toLocaleTimeString()}
            </Text>
          )}
        </Box>

        {internalLoading && !message && (
          <Box borderColor='cyan' borderStyle='single' flexDirection='column' marginY={1} paddingX={1} width={contentWidth}>
            {!thought && (
              <Text color='yellow'>
                <Spinner type='dots' /> {loadingText}
              </Text>
            )}
            {thought && (
              <Box flexDirection='column' width='100%'>
                <Box marginBottom={1}>
                  <Text color='cyan' dimColor>
                    AGENT PROGRESS
                  </Text>
                </Box>
                {(() => {
                  const items = getCleanThoughts(thought);
                  if (items.length === 0) {
                    return (
                      <Text color='yellow'>
                        <Spinner type='dots' /> Thinking...
                      </Text>
                    );
                  }
                  return (
                    <Box flexDirection='column'>
                      {items.slice(-5).map((item, index) => (
                        <Text color='yellow' key={index}>
                          • {item}
                        </Text>
                      ))}
                    </Box>
                  );
                })()}
              </Box>
            )}
          </Box>
        )}

        {showResult && (
          <>
            {editing ? (
              <Box borderColor='cyan' borderStyle='single' flexDirection='column' paddingX={1} width={contentWidth}>
                <Box paddingY={1}>
                  <TextInput onChange={setMessage} onSubmit={() => setEditing(false)} value={message} />
                </Box>
              </Box>
            ) : (
              <ScrollableBox borderColor='cyan' content={message} maxHeight={boxHeight} width={contentWidth} />
            )}
            {internalLoading && height > 18 && (
              <Box flexDirection='column' marginTop={1} paddingX={1} width={contentWidth}>
                <Text color='yellow'>
                  <Spinner type='dots' /> {thought ? 'Thinking...' : 'Streaming...'}
                </Text>
              </Box>
            )}
          </>
        )}

        {dataLoading && !message && (
          <Box paddingX={1} width={contentWidth}>
            <Text color='cyan'>
              <Spinner type='dots' /> Loading data...
            </Text>
          </Box>
        )}
      </Box>

      {!internalLoading && !dataLoading && !editing && status === 'idle' && (
        <Box flexWrap='wrap' gap={width > 60 ? 2 : 1} justifyContent='center' marginTop={1} width='100%'>
          <Text bold color='green'>
            [a] Commit
          </Text>
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
          <Text color='yellow'>Press [Enter] to save changes</Text>
        </Box>
      )}

      {status === 'committing' && (
        <Box justifyContent='center' marginTop={1}>
          <Text color='cyan'>
            <Spinner type='dots' /> Executing git commit...
          </Text>
        </Box>
      )}
    </Box>
  );
};
