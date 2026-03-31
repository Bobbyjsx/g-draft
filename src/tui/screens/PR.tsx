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

interface PRScreenProps {
  gitService: GitService;
  config: Config;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export const PRScreen: React.FC<PRScreenProps> = ({ gitService, config, onBack, setLoading }) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [diff, setDiff] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isCached, setIsCached] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const provider = useMemo(() => getProvider(config.provider), [config.provider]);

  const {
    generate,
    loading: internalLoading,
    error,
    result: prContent,
    setResult: setPrContent,
    setError,
    lastGeneratedAt,
    setLastGeneratedAt,
    lastMetadata,
    setLastMetadata,
  } = useAIGenerator({
    action: 'pr',
    diff,
    metadata: { branch },
    prompt,
    provider,
    setGlobalLoading: setLoading,
  });

  const loadingText = useLoadingMessages('pr', internalLoading || dataLoading, { branch });
  const { copy, copied } = useClipboard();
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const b = await gitService.getCurrentBranch();
      setBranch(b);

      const { diff: d } = await gitService.getDiff({
        baseBranch: config.baseBranch,
        mode: 'auto',
      });
      if (!d) {
        setError('No changes found for PR. Compare with base branch.');
        setDataLoading(false);
        return;
      }
      setDiff(d);

      const template = await gitService.getPRTemplate();
      const p = template ? PROMPTS.PR_WITH_TEMPLATE(template, d) : PROMPTS.PR_NO_TEMPLATE(d);
      setPrompt(p);

      // Check cache
      const cached = cacheManager.get('pr');
      if (cached && cached.diffHash === cacheManager.generateDiffHash(d)) {
        setPrContent(cached.content);
        setLastGeneratedAt(cached.timestamp);
        setLastMetadata(cached.metadata ?? null);
        setIsCached(true);
      }
    } catch (e: any) {
      setError(e.message || 'Error loading PR data');
    } finally {
      setDataLoading(false);
    }
  }, [config.baseBranch, gitService, setError, setPrContent, setLastGeneratedAt, setLastMetadata]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (prompt && !prContent && !internalLoading && !error && !isCached && !dataLoading) {
      generate();
    }
  }, [prompt, prContent, internalLoading, error, generate, isCached, dataLoading]);

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

  return (
    <Box flexDirection='column' height='100%'>
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

          <Box flexDirection={width > 90 ? 'row' : 'column'} flexGrow={1} gap={1}>
            {/* Left Side: Diff Overview */}
            {width > 60 && (
              <ScrollableBox
                borderColor='gray'
                content={diff}
                maxHeight={width > 90 ? (stdout?.rows || 20) - 10 : 8}
                title='Diff Overview'
                titleColor='gray'
                width={width > 90 ? Math.floor(width * 0.4) : width}
              />
            )}

            {/* Right Side: PR Content */}
            {editing ? (
              <Box
                borderColor='blue'
                borderStyle='round'
                flexDirection='column'
                flexGrow={1}
                paddingX={1}
                width={width > 90 ? '60%' : '100%'}
              >
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
                maxHeight={width > 90 ? (stdout?.rows || 20) - 10 : 12}
                title='PR Description'
                titleColor='cyan'
                width={width > 90 ? Math.floor(width * 0.58) : width}
              />
            )}
          </Box>
        </Box>
      )}

      {!isActuallyLoading && !editing && (
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
