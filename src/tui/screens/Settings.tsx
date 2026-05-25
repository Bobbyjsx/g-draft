import type React from 'react';
import { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
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

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ configManager, config, setConfig, onBack }) => {
  const [view, setView] = useState<SettingsView>('menu');
  const [tempBranch, setTempBranch] = useState(config.baseBranch);
  const [tempInstructions, setTempInstructions] = useState(config.customInstructions);
  const [instructionTarget, setInstructionTarget] = useState<'global' | 'project'>('global');
  const { stdout } = useStdout();

  const menuItems = [
    { label: 'AI Provider', value: 'provider' },
    { label: 'Base Branch', value: 'branch' },
    { label: 'Global Instructions', value: 'instructions-global' },
    { label: 'Project Instructions', value: 'instructions-project' },
    { label: 'Back to Dashboard', value: 'back' },
  ];

  const providers = [
    { label: 'Google Gemini', value: 'gemini' },
    { label: 'Anthropic Claude', value: 'claude' },
    { label: 'OpenAI Codex', value: 'codex' },
    { label: 'Amazon Q Developer', value: 'amazon-q' },
  ];

  const handleMenuSelect = (item: { value: string }) => {
    if (item.value === 'back') {
      onBack();
    } else if (item.value === 'instructions-global') {
      setInstructionTarget('global');
      setTempInstructions(configManager.getGlobalConfig().customInstructions);
      setView('instructions');
    } else if (item.value === 'instructions-project') {
      setInstructionTarget('project');
      const projectConfig = configManager.getProjectConfig();
      setTempInstructions(projectConfig.customInstructions || '');
      setView('instructions');
    } else {
      setView(item.value as SettingsView);
    }
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
    if (instructionTarget === 'global') {
      configManager.setGlobalConfig('customInstructions', value);
    } else {
      const projectConfig = configManager.getProjectConfig();
      configManager.setProjectConfig({ ...projectConfig, customInstructions: value });
    }

    // Update the merged config in the app state
    const newConfig = configManager.getMergedConfig();
    setConfig(newConfig);
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
    <Box flexDirection='column' height='100%' width='100%'>
      <Header />

      <Box
        alignItems={view === 'instructions' ? 'stretch' : 'center'}
        flexDirection='column'
        flexGrow={1}
        justifyContent={view === 'instructions' ? 'flex-start' : 'center'}
        paddingX={view === 'instructions' ? 4 : 2}
      >
        {view === 'menu' && (
          <Box borderColor='gray' borderStyle='round' flexDirection='column' paddingX={4} paddingY={1}>
            <Box marginBottom={1}>
              <Text bold color='yellow'>
                Settings
              </Text>
            </Box>
            <SelectInput items={menuItems} onSelect={handleMenuSelect} />
            <Box flexDirection='column' marginTop={1} paddingTop={1}>
              <Box>
                <Text color='gray' dimColor>
                  Active Provider:{' '}
                </Text>
                <Text color='cyan'>{config.provider.charAt(0).toUpperCase() + config.provider.slice(1).toLowerCase()}</Text>
              </Box>
              <Box>
                <Text color='gray' dimColor>
                  Primary Branch:{' '}
                </Text>
                <Text color='white'>{config.baseBranch}</Text>
              </Box>
            </Box>
          </Box>
        )}

        {view === 'provider' && (
          <Box borderColor='cyan' borderStyle='round' flexDirection='column' paddingX={4} paddingY={1}>
            <Box marginBottom={1}>
              <Text bold color='cyan'>
                AI Provider
              </Text>
            </Box>
            <SelectInput items={providers} onSelect={handleProviderSelect} />
          </Box>
        )}

        {view === 'branch' && (
          <Box borderColor='magenta' borderStyle='round' flexDirection='column' paddingX={4} paddingY={1}>
            <Box marginBottom={1}>
              <Text bold color='magenta'>
                Base Branch
              </Text>
            </Box>
            <Box flexDirection='row'>
              <Text>Branch: </Text>
              <TextInput onChange={setTempBranch} onSubmit={handleBranchSubmit} value={tempBranch} />
            </Box>
            <Box marginTop={1}>
              <Text color='gray' dimColor italic>
                Press [Enter] to save, [Esc] to cancel
              </Text>
            </Box>
          </Box>
        )}

        {view === 'instructions' && (
          <Box flexDirection='column' flexGrow={1} marginTop={1} width='100%'>
            <Box marginBottom={1}>
              <Text bold color='blue'>
                {instructionTarget === 'global' ? 'Global' : 'Project'} Instructions
              </Text>
              <Text color='gray' dimColor>
                {' '}
                — Custom rules for AI generation
              </Text>
            </Box>

            <Box borderColor='gray' borderStyle='single' flexGrow={1} minHeight={16} padding={1}>
              <MultilineInput
                focus={view === 'instructions'}
                maxRows={20}
                onChange={(val: string) => {
                  setTempInstructions(val);
                }}
                placeholder='Type your custom instructions here...'
                rows={12}
                showCursor
                value={tempInstructions}
              />
            </Box>

            <Box justifyContent='space-between' marginTop={1} width='100%'>
              <Box gap={2}>
                <Text color='gray' dimColor>
                  [Esc] Save & Exit
                </Text>
                <Text color='gray' dimColor>
                  [Enter] New Line
                </Text>
              </Box>
              <Text color='blue' dimColor>
                {tempInstructions.length} characters
              </Text>
            </Box>
          </Box>
        )}
      </Box>

      {view !== 'instructions' && (
        <Box justifyContent='center' marginBottom={1} marginTop={1}>
          <Text color='gray' dimColor>
            [esc] {view === 'menu' ? 'Dashboard' : 'Back'}
          </Text>
        </Box>
      )}
    </Box>
  );
};
