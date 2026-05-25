import type React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { APP_VERSION } from '../../core/version.js';

interface StatusBarProps {
  screen: string;
  loading?: boolean;
  projectInfo?: { id: string; name: string; path: string } | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ screen, loading, projectInfo }) => {
  const formatScreenName = (s: string) => {
    return s
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Box justifyContent='space-between' paddingTop={2} paddingX={2} width='100%'>
      <Box gap={1}>
        <Box paddingX={1}>
          <Text bold color='white'>
            {formatScreenName(screen)}
          </Text>
        </Box>
        {projectInfo && (
          <Box marginLeft={1}>
            <Text color='gray' dimColor>
              {projectInfo.name} · {projectInfo.path}
            </Text>
          </Box>
        )}
        {loading && (
          <Box marginLeft={1}>
            <Text color='yellow'>
              <Spinner type='dots' />{' '}
              <Text color='white' dimColor>
                Processing...
              </Text>
            </Text>
          </Box>
        )}
      </Box>

      <Box>
        <Text color='gray' dimColor>
          v{APP_VERSION}
        </Text>
      </Box>
    </Box>
  );
};
