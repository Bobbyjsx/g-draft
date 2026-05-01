import type React from 'react';
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
// @ts-expect-error
import { MultilineInput } from 'ink-multiline-input';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { Config, ConfigManager } from '../../core/config.js';
import { Header } from '../components/Header.js';

interface SettingsScreenProps {
  configManager: ConfigManager;
  config: Config;
  setConfig: (config: Config) => void;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

type SettingsView = 'menu' | 'provider' | 'branch' | 'instructions';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ configManager, config, setConfig, onBack, setLoading }) => {
  const [view, setView] = useState<SettingsView>('menu');
  const [tempBranch, setTempBranch] = useState(config.baseBranch);
  const [tempInstructions, setTempInstructions] = useState(config.customInstructions);

  const menuItems = [
    { label: 'Select AI Provider', value: 'provider' },
    { label: 'Update Base Branch', value: 'branch' },
    { label: 'Custom AI Instructions', value: 'instructions' },
    { label: 'Back to Dashboard', value: 'back' },
  ];

  const providers = [
    { label: 'Google Gemini', value: 'gemini' },
    { label: 'Anthropic Claude', value: 'claude' },
    { label: 'OpenAI Codex', value: 'codex' },
    { label: 'Amazon Q Developer', value: 'amazon-q' },
  ];

  const handleMenuSelect = (item: { value: string }) => {
    if (item.value === 'back') onBack();
    else setView(item.value as SettingsView);
  };

  const handleProviderSelect = (item: { value: string }) => {
    configManager.setGlobalConfig('provider', item.value);
    setConfig({ ...config, provider: item.value as any });
    setView('menu');
  };

  const handleBranchSubmit = (value: string) => {
    configManager.setGlobalConfig('baseBranch', value);
    setConfig({ ...config, baseBranch: value });
    setView('menu');
  };

  const handleInstructionsSubmit = (value: string) => {
    configManager.setGlobalConfig('customInstructions', value);
    setConfig({ ...config, customInstructions: value });
    setView('menu');
  };

  useInput((_input, key) => {
    if (key.escape) {
      if (view === 'menu') {
        onBack();
      } else if (view === 'instructions') {
        handleInstructionsSubmit(tempInstructions);
      } else {
        setView('menu');
      }
    }
  });

  return (
    <Box flexDirection='column' height='100%'>
      <Header />

      <Box alignItems='center' flexDirection='column' flexGrow={1} justifyContent='center'>
        {view === 'menu' && (
          <Box alignItems='center' borderColor='yellow' borderStyle='round' flexDirection='column' paddingX={3} paddingY={1}>
            <Text bold color='yellow'>
              Settings
            </Text>
            <Box marginTop={1}>
              <SelectInput items={menuItems} onSelect={handleMenuSelect} />
            </Box>
          </Box>
        )}

        {view === 'provider' && (
          <Box alignItems='center' borderColor='cyan' borderStyle='round' flexDirection='column' paddingX={3} paddingY={1}>
            <Text bold color='cyan'>
              Select AI Provider
            </Text>
            <Box marginTop={1}>
              <SelectInput items={providers} onSelect={handleProviderSelect} />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Current: {config.provider.toUpperCase()}</Text>
            </Box>
          </Box>
        )}

        {view === 'branch' && (
          <Box alignItems='center' borderColor='magenta' borderStyle='round' flexDirection='column' paddingX={3} paddingY={1}>
            <Text bold color='magenta'>
              Update Base Branch
            </Text>
            <Box flexDirection='row' marginTop={1}>
              <Text>Base Branch: </Text>
              <TextInput onChange={setTempBranch} onSubmit={handleBranchSubmit} value={tempBranch} />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Current: {config.baseBranch}</Text>
            </Box>
            <Box marginTop={1}>
              <Text italic>Press [Enter] to save, [Esc] to cancel</Text>
            </Box>
          </Box>
        )}

        {view === 'instructions' && (
          <Box borderColor='blue' borderStyle='round' flexDirection='column' minWidth={60} paddingX={2} paddingY={1}>
            <Box justifyContent='center'>
              <Text bold color='blue'>
                Custom AI Instructions
              </Text>
            </Box>
            <Box marginTop={1} minHeight={5} paddingX={1}>
              <MultilineInput onChange={setTempInstructions} value={tempInstructions} />
            </Box>
            <Box marginTop={1}>
              <Text dimColor italic>
                [Enter] for new line • [Esc] to save and exit
              </Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box justifyContent='center' marginTop={1}>
        <Text color='gray'>[esc] {view === 'menu' ? 'Back' : view === 'instructions' ? 'Save & Exit' : 'Cancel'}</Text>
      </Box>
    </Box>
  );
};
