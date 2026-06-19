import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Box, useApp, useInput, useStdout } from 'ink';
import type { Config, ConfigManager } from '../core/config.js';
import type { GitService } from '../core/git.js';
import { getProvider } from '../providers/index.js';
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
  const [projectInfo, setProjectInfo] = useState<{ id: string; name: string; path: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { exit } = useApp();
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;
  const height = stdout?.rows || 24;

  const aiProvider = useMemo(() => getProvider(config.provider), [config.provider]);

  useEffect(() => {
    gitService.getProjectInfo().then(setProjectInfo);

    // Prewarm provider
    if (aiProvider.prewarm) {
      aiProvider.prewarm().catch(() => {
        /* Silent fail for prewarm */
      });
    }
  }, [gitService, aiProvider]);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      const handleExit = async () => {
        try {
          setScreen('exit');
          // Wait for render cycle to complete so user sees the Exit screen
          await new Promise((resolve) => setTimeout(resolve, 500));

          if (aiProvider.dispose) {
            // Race disposal against a timeout to prevent hanging the exit
            await Promise.race([aiProvider.dispose(), new Promise((resolve) => setTimeout(resolve, 3000))]);
          }
        } catch (_e) {
          // Silent catch for exit cleanup
        } finally {
          exit();
        }
      };
      handleExit().catch(() => exit());
    }

    if (key.escape) {
      if (!['splash', 'exit', 'settings'].includes(screen)) {
        setScreen('dashboard');
      }
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
          <CommitScreen
            aiProvider={aiProvider}
            config={config}
            gitService={gitService}
            onBack={() => setScreen('dashboard')}
            setLoading={setLoading}
          />
        );
      case 'pr':
        return (
          <PRScreen
            aiProvider={aiProvider}
            config={config}
            gitService={gitService}
            onBack={() => setScreen('dashboard')}
            setLoading={setLoading}
          />
        );
      case 'review':
        return (
          <ReviewScreen
            aiProvider={aiProvider}
            config={config}
            gitService={gitService}
            onBack={() => setScreen('dashboard')}
            setLoading={setLoading}
          />
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

  const showBorder = width > 50 && height > 15;

  return (
    <Box borderColor='blue' borderStyle={showBorder ? 'round' : undefined} flexDirection='column' height='100%' width='100%'>
      <Box flexDirection='column' flexGrow={1} paddingX={showBorder ? 1 : 0} width='100%'>
        {renderScreen()}
      </Box>
      <Box marginTop={0} width='100%'>
        <StatusBar loading={loading} projectInfo={projectInfo} screen={screen} />
      </Box>
    </Box>
  );
};
