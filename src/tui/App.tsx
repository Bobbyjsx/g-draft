import type React from 'react';
import { useState } from 'react';
import { Box, useApp, useInput } from 'ink';
import type { Config, ConfigManager } from '../core/config.js';
import type { GitService } from '../core/git.js';
import { StatusBar } from './components/StatusBar.js';
import { CommitScreen } from './screens/Commit.js';
import { Dashboard } from './screens/Dashboard.js';
import { ExitScreen } from './screens/Exit.js';
import { PRScreen } from './screens/PR.js';
import { ProvidersStatusScreen } from './screens/ProvidersStatus.js';
import { ReviewScreen } from './screens/Review.js';
import { SettingsScreen } from './screens/Settings.js';
import { SplashScreen } from './screens/SplashScreen.js';

export type Screen = 'splash' | 'dashboard' | 'commit' | 'pr' | 'review' | 'settings' | 'providers-status' | 'exit';

interface AppProps {
  configManager: ConfigManager;
  gitService: GitService;
  initialConfig: Config;
}

export const App: React.FC<AppProps> = ({ configManager, gitService, initialConfig }) => {
  const [screen, setScreen] = useState<Screen>('splash');
  const [config, setConfig] = useState<Config>(initialConfig);
  const [loading, setLoading] = useState(false);
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      setScreen('exit');
      setTimeout(() => exit(), 1000);
    }

    if (key.escape) {
      setScreen('dashboard');
    }
  });

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return <SplashScreen onComplete={() => setScreen('dashboard')} />;
      case 'dashboard':
        return <Dashboard config={config} gitService={gitService} onSelect={setScreen} setLoading={setLoading} />;
      case 'commit':
        return (
          <CommitScreen config={config} gitService={gitService} onBack={() => setScreen('dashboard')} setLoading={setLoading} />
        );
      case 'pr':
        return <PRScreen config={config} gitService={gitService} onBack={() => setScreen('dashboard')} setLoading={setLoading} />;
      case 'review':
        return (
          <ReviewScreen config={config} gitService={gitService} onBack={() => setScreen('dashboard')} setLoading={setLoading} />
        );
      case 'settings':
        return (
          <SettingsScreen
            config={config}
            configManager={configManager}
            onBack={() => setScreen('dashboard')}
            setConfig={setConfig}
            setLoading={setLoading}
          />
        );
      case 'providers-status':
        return <ProvidersStatusScreen onBack={() => setScreen('dashboard')} setLoading={setLoading} />;
      case 'exit':
        return <ExitScreen />;
      default:
        return <Dashboard config={config} gitService={gitService} onSelect={setScreen} setLoading={setLoading} />;
    }
  };

  return (
    <Box borderColor='blue' borderStyle='round' flexDirection='column' height='100%' width='100%'>
      <Box flexDirection='column' flexGrow={1} paddingX={1} width='100%'>
        {renderScreen()}
      </Box>
      <Box marginTop={0} width='100%'>
        <StatusBar loading={loading} screen={screen} />
      </Box>
    </Box>
  );
};
