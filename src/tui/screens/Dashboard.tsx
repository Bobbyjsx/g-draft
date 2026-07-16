import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { Screen } from '../App.js';
import type { Config } from '../../core/config.js';
import type { GitService } from '../../core/git.js';
import { Header } from '../components/Header.js';
import { useTerminalDimensions } from '../hooks/useTerminalDimensions.js';

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
  const { width, height } = useTerminalDimensions();

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      if (!(await gitService.isRepo())) {
        setError('Not a git repository');
        return;
      }

      const branch = await gitService.getCurrentBranch();
      setCurrentBranch(branch);
      const diff = await gitService.getDiff({ mode: 'staged' });
      setStagedChanges(!!diff.diff);
    } catch (e: any) {
      setError(`Error loading git status: ${e.stderr || e.message}`);
    } finally {
      setLoading(false);
    }
  }, [gitService, setLoading]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSelect = (item: { value: string }) => {
    onSelect(item.value as Screen);
  };

  const items = [
    {
      label: stagedChanges ? 'Generate Commit Message (Staged)' : 'Generate Commit Message (Auto)',
      value: 'commit',
    },
    { label: 'Generate PR Description', value: 'pr' },
    { label: 'Perform Code Review', value: 'review' },
    { label: 'Settings', value: 'settings' },
    { label: 'AI Provider Status', value: 'providers-status' },
  ];

  if (error) {
    return (
      <Box alignItems='center' flexDirection='column' height='100%' justifyContent='center'>
        <Header />
        <Box marginTop={1}>
          <Text color='red'>Error: {error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color='gray'>Press Q to exit</Text>
        </Box>
      </Box>
    );
  }

  const showDescriptions = width > 70 && height > 22;
  const showFooterDetails = width > 65;

  return (
    <Box flexDirection='column' height='100%' width='100%'>
      <Header />

      <Box flexDirection='column' flexGrow={1} marginTop={height > 15 ? 1 : 0} paddingX={width > 40 ? 2 : 0} width='100%'>
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
            limit={Math.max(3, height - 12)}
            onSelect={handleSelect}
          />
        </Box>

        {/* Action descriptions (only show if enough space) */}
        {showDescriptions && (
          <Box flexDirection='column' marginTop={1} paddingLeft={4}>
            <Text color='gray' italic>
              Select an action above and press Enter to proceed.
            </Text>
          </Box>
        )}
      </Box>

      {/* FOOTER CONTROLS */}
      <Box
        flexDirection={showFooterDetails ? 'row' : 'column'}
        gap={showFooterDetails ? 3 : 0}
        justifyContent='flex-start'
        marginTop={1}
        paddingX={width > 40 ? 2 : 1}
        width='100%'
      >
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
        {showFooterDetails && (
          <Box gap={2}>
            <Box gap={1}>
              <Text color='gray' dimColor>
                Branch:
              </Text>
              <Text color='white'>{currentBranch}</Text>
            </Box>
            <Box gap={1}>
              <Text color='gray' dimColor>
                Provider:
              </Text>
              <Text color='cyan'>{config.provider.charAt(0).toUpperCase() + config.provider.slice(1).toLowerCase()}</Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
