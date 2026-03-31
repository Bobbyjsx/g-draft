import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
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

interface CommitScreenProps {
  gitService: GitService;
  config: Config;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export const CommitScreen: React.FC<CommitScreenProps> = ({ gitService, config, onBack, setLoading }) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'committing' | 'done'>('idle');
  const [diff, setDiff] = useState<string>('');
  const [isCached, setIsCached] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const provider = useMemo(() => getProvider(config.provider), [config.provider]);
  const prompt = useMemo(() => (diff ? PROMPTS.COMMIT(diff) : ''), [diff]);

  const {
    generate,
    loading: internalLoading,
    error,
    result: message,
    setResult: setMessage,
    setError,
    lastGeneratedAt,
    setLastGeneratedAt,
  } = useAIGenerator({
    action: 'commit',
    diff,
    prompt,
    provider,
    setGlobalLoading: setLoading,
  });

  const loadingText = useLoadingMessages('commit', internalLoading || dataLoading);
  const { copy, copied } = useClipboard();
  const { stdout } = useStdout();

  const loadDiff = useCallback(async () => {
    setDataLoading(true);
    try {
      const d = await gitService.getDiff({ mode: 'staged' });
      if (!d) {
        setError('No staged changes found. Stage some files first.');
        setDataLoading(false);
        return;
      }
      setDiff(d);

      // Check cache
      const cached = cacheManager.get('commit');
      if (cached && cached.diffHash === cacheManager.generateDiffHash(d)) {
        setMessage(cached.content);
        setLastGeneratedAt(cached.timestamp);
        setIsCached(true);
      }
    } catch (e: any) {
      setError(e.message || 'Error loading diff');
    } finally {
      setDataLoading(false);
    }
  }, [gitService, setError, setMessage, setLastGeneratedAt]);

  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  useEffect(() => {
    // Only auto-generate if no cache was found
    if (diff && !message && !internalLoading && !error && !isCached && !dataLoading) {
      generate();
    }
  }, [diff, message, internalLoading, error, generate, isCached, dataLoading]);

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
          if (!diff) loadDiff();
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

  return (
    <Box flexDirection='column' gap={1}>
      <Header />

      <Box flexDirection='column' gap={1}>
        <Box justifyContent='space-between' width={(stdout?.columns || 80) - 4}>
          <Text bold color='cyan'>
            Generated Commit Message
          </Text>
          {!isActuallyLoading && lastGeneratedAt && (
            <Text color='gray' dimColor italic>
              {isCached ? 'Loaded from cache' : 'Generated'} at {new Date(lastGeneratedAt).toLocaleTimeString()}
            </Text>
          )}
        </Box>

        {isActuallyLoading ? (
          <Box borderColor='cyan' borderStyle='single' flexDirection='column' marginY={1} paddingX={1}>
            <Text color='yellow'>
              <Spinner type='dots' /> {loadingText}
            </Text>
          </Box>
        ) : editing ? (
          <Box borderColor='cyan' borderStyle='single' flexDirection='column' paddingX={1} width={(stdout?.columns || 80) - 4}>
            <Box paddingY={1}>
              <TextInput onChange={setMessage} onSubmit={() => setEditing(false)} value={message} />
            </Box>
          </Box>
        ) : (
          <ScrollableBox
            borderColor='cyan'
            content={message}
            maxHeight={(stdout?.rows || 20) - 12}
            width={(stdout?.columns || 80) - 4}
          />
        )}
      </Box>

      {!isActuallyLoading && !editing && status === 'idle' && (
        <Box gap={2} justifyContent='center' marginTop={1}>
          <Text bold color='green'>
            [a] Accept & Commit
          </Text>
          <Text bold color='yellow'>
            [e] Edit
          </Text>
          <Text bold color='cyan'>
            [c] {copied ? 'Copied!' : 'Copy'}
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
