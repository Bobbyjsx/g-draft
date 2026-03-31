import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { ALL_PROVIDERS } from '../../providers/index.js';
import { Header } from '../components/Header.js';

interface ProviderStatus {
  name: string;
  available: boolean;
  installGuide: string;
}

interface ProvidersStatusProps {
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export const ProvidersStatusScreen: React.FC<ProvidersStatusProps> = ({ onBack, setLoading }) => {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);

  const checkProviders = useCallback(async () => {
    setLoading(true);
    const newStatuses: ProviderStatus[] = [];
    for (const provider of ALL_PROVIDERS) {
      const available = await provider.isAvailable();
      newStatuses.push({
        available,
        installGuide: provider.installGuide,
        name: provider.name,
      });
    }
    setStatuses(newStatuses);
    setLoading(false);
  }, [setLoading]);

  useEffect(() => {
    checkProviders();
  }, [checkProviders]);

  return (
    <Box flexDirection='column' height='100%'>
      <Header />

      <Box borderColor='cyan' borderStyle='round' flexDirection='column' flexGrow={1} marginY={1} paddingX={2}>
        <Text bold color='cyan' underline>
          AI Providers Status
        </Text>
        <Box flexDirection='column' marginTop={1}>
          {statuses.map((s) => (
            <Box flexDirection='column' key={s.name} marginBottom={1}>
              <Box gap={2}>
                <Text bold>{s.name.toUpperCase()}</Text>
                <Text color={s.available ? 'green' : 'red'}>{s.available ? '✓ Installed' : '✗ Not Found'}</Text>
              </Box>
              {!s.available && (
                <Box paddingLeft={2}>
                  <Text dimColor italic>
                    Install: {s.installGuide}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box justifyContent='center'>
        <Text color='gray'>[esc] Back to Dashboard</Text>
      </Box>
    </Box>
  );
};
