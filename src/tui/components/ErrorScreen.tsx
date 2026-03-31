import type React from 'react';
import { Box, Text, useStdout } from 'ink';
import { Header } from './Header.js';

interface ErrorScreenProps {
  error: string;
  onRetry?: () => void;
  onHome?: () => void;
  onQuit?: () => void;
  onReport?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry, onHome, onQuit, onReport }) => {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  return (
    <Box alignItems='center' flexDirection='column' height='100%' justifyContent='center' width='100%'>
      <Header />

      <Box
        alignItems='center'
        borderColor='red'
        borderStyle='double'
        flexDirection='column'
        paddingX={width > 60 ? 4 : 1}
        paddingY={1}
        width={width > 60 ? '80%' : '100%'}
      >
        <Box backgroundColor='red' marginBottom={1} paddingX={1}>
          <Text bold color='white'>
            {' '}
            ERROR DETECTED{' '}
          </Text>
        </Box>
        <Box alignItems='center' justifyContent='center' paddingX={width > 60 ? 2 : 0} width='100%'>
          <Text color='red' wrap='wrap'>
            {error}
          </Text>
        </Box>
      </Box>

      <Box
        alignItems='center'
        flexDirection={width > 60 ? 'row' : 'column'}
        gap={width > 60 ? 4 : 1}
        justifyContent='center'
        marginTop={2}
        width='100%'
      >
        {onRetry && (
          <Text bold color='green'>
            {' '}
            [R] Retry Action{' '}
          </Text>
        )}
        {onHome && (
          <Text bold color='cyan'>
            {' '}
            [ESC] Return Home{' '}
          </Text>
        )}
        {onReport && (
          <Text bold color='yellow'>
            {' '}
            [B] Report Bug{' '}
          </Text>
        )}
        {onQuit && (
          <Text bold color='gray'>
            {' '}
            [Q] Exit{' '}
          </Text>
        )}
      </Box>

      {width > 60 && (
        <Box marginTop={2}>
          <Text dimColor italic>
            Verify your provider installation and network connectivity.
          </Text>
        </Box>
      )}
    </Box>
  );
};
