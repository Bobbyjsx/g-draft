import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import SelectInput from 'ink-select-input';
import type { Screen } from '../App.js';
import type { Config } from '../../core/config.js';
import type { GitService } from '../../core/git.js';
import { ErrorScreen } from '../components/ErrorScreen.js';
import { Header } from '../components/Header.js';

interface DashboardProps {
  gitService: GitService;
  config: Config;
  onSelect: (screen: Screen) => void;
  setLoading: (loading: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ gitService, config, onSelect, setLoading }) => {
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [stagedChanges, setStagedChanges] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      if (!(await gitService.isRepo())) {
        setError('Not a git repository. Please run gdraft inside a git repo.');
        setLoading(false);
        return;
      }
      const branch = await gitService.getCurrentBranch();
      setCurrentBranch(branch);
      const diff = await gitService.getDiff({ mode: 'staged' });
      setStagedChanges(!!diff);
    } catch (e: any) {
      setError(`Error loading git status: ${e.stderr || e.message}`);
    } finally {
      setLoading(false);
    }
  }, [gitService, setLoading]);

  useEffect(() => {
    loadStatus();
    return () => setLoading(false);
  }, [loadStatus, setLoading]);

  const items = [
    {
      desc: 'Automate conventional commits',
      label: `Clean & Commit ${stagedChanges ? '' : '(No staged changes)'}`,
      value: 'commit' as Screen,
    },
    {
      desc: 'Create context-aware pull request descriptions',
      label: 'Generate PR',
      value: 'pr' as Screen,
    },
    {
      desc: 'AI-powered code review for bugs and security',
      label: 'Audit Changes',
      value: 'review' as Screen,
    },
    {
      desc: 'Check installation of AI CLI tools',
      label: 'AI Providers Status',
      value: 'providers-status' as Screen,
    },
    {
      desc: 'Configure providers and defaults',
      label: 'Settings',
      value: 'settings' as Screen,
    },
  ];

  const handleSelect = (item: { value: Screen }) => {
    onSelect(item.value);
  };

  if (error) {
    return (
      <ErrorScreen
        error={error}
        onHome={() => setError(null)}
        onQuit={() => process.exit()}
        onRetry={() => {
          setError(null);
          loadStatus();
        }}
      />
    );
  }

  return (
    <Box flexDirection='column' height='100%' width='100%'>
      <Header />

      <Box flexDirection='column' flexGrow={1} marginTop={1} paddingX={2} width='100%'>
        {/* DASHBOARD ACTIONS */}
        <Box flexDirection='column' gap={0}>
          <SelectInput
            itemComponent={({ label, isSelected }) => (
              <Box>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '➤ ' : '  '}
                  {label}
                </Text>
              </Box>
            )}
            items={items}
            onSelect={handleSelect}
          />
        </Box>

        {/* Action descriptions (only show if enough width) */}
        {width > 60 && (
          <Box flexDirection='column' marginTop={1} paddingLeft={4}>
            <Text italic>Select an action above and press Enter to proceed.</Text>
          </Box>
        )}
      </Box>

      {/* FOOTER CONTROLS */}
      <Box gap={3} justifyContent='flex-start' marginTop={1} paddingX={2} width='100%'>
        <Text color='gray'>
          ↑↓ Select •{' '}
          <Text bold color='white'>
            Enter
          </Text>{' '}
          Apply •{' '}
          <Text bold color='white'>
            Q
          </Text>{' '}
          Quit
        </Text>
        {width > 60 && (
          <>
            <Box gap={1}>
              <Text dimColor>BRANCH:</Text>
              <Text bold color='white'>
                {currentBranch}
              </Text>
            </Box>
            <Box gap={1}>
              <Text dimColor>PROVIDER:</Text>
              <Text bold color='cyan'>
                {config.provider.toUpperCase()}
              </Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
