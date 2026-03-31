import type React from 'react';
import { useEffect, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';

export const ExitScreen: React.FC = () => {
  const [dots, setDots] = useState('');
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : `${d}.`));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box alignItems='center' flexDirection='column' height='100%' justifyContent='center' width='100%'>
      {width > 60 ? (
        <Gradient name='atlas'>
          <BigText font='tiny' text='BYE' />
        </Gradient>
      ) : (
        <Text bold color='cyan'>
          B Y E
        </Text>
      )}

      <Box borderColor='blueBright' borderStyle='round' marginTop={2} paddingX={width > 60 ? 3 : 1} paddingY={1}>
        <Text bold color='blueBright' italic>
          G-DRAFT SESSIONS TERMINATED
        </Text>
      </Box>

      <Box marginTop={2}>
        <Text color='cyan'>
          <Spinner type='dots' /> Cleaning up AI context and workspace{dots}
        </Text>
      </Box>

      <Box marginTop={3}>
        <Text dimColor>See you in the next commit. ✦</Text>
      </Box>
    </Box>
  );
};
