import type React from 'react';
import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Header } from '../components/Header.js';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          onComplete();
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <Box alignItems='center' flexDirection='column' height='100%' justifyContent='center'>
      <Header />

      <Box alignItems='center' flexDirection='column' marginTop={2}>
        <Box borderColor='gray' borderStyle='single' width={30}>
          <Box backgroundColor='cyan' height={1} width={`${progress}%`} />
        </Box>
        <Box marginTop={1}>
          <Text color='cyan'>
            <Spinner type='dots' /> Initializing AI context...
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
