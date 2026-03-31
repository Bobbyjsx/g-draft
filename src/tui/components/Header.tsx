import type React from 'react';
import { useEffect, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import latestVersion from 'latest-version';
import semver from 'semver';
import { APP_VERSION } from '../../core/version.js';

const pkg = {
  name: 'g-draft',
  version: APP_VERSION,
};

export const Header: React.FC = () => {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;
  const height = stdout?.rows || 24;

  useEffect(() => {
    async function checkUpdate() {
      try {
        const latest = await latestVersion(pkg.name);
        if (semver.gt(latest, pkg.version)) {
          setNewVersion(latest);
        }
      } catch (_e) {
        // Silent fail for offline/dev
      }
    }
    // Only check update if we are not in a very small window
    if (height > 10) {
      checkUpdate();
    }
  }, [height]);

  const showBigText = width > 70 && height > 20;

  return (
    <Box alignItems='center' flexDirection='column' marginBottom={height > 15 ? 1 : 0} width='100%'>
      <Box
        alignItems='center'
        borderColor='cyan'
        borderStyle={height > 15 ? 'double' : 'single'}
        flexDirection='column'
        paddingX={width > 60 ? 4 : 1}
        paddingY={height > 20 ? 1 : 0}
      >
        {showBigText ? (
          <Gradient name='atlas'>
            <BigText font='tiny' text='G-DRAFT' />
          </Gradient>
        ) : (
          <Text bold color='cyan'>
            G - D R A F T
          </Text>
        )}

        <Box marginTop={showBigText ? 1 : 0}>
          <Text bold color='cyan'>
            AI-POWERED GIT ASSISTANT v{pkg.version}
          </Text>
        </Box>
      </Box>

      {newVersion && (
        <Box backgroundColor='yellow' marginTop={1} paddingX={2}>
          <Text bold color='black'>
            🚀 UPDATE AVAILABLE: {pkg.version} → {newVersion}. Run `npm i -g g-draft`
          </Text>
        </Box>
      )}

      {height > 25 && (
        <Box justifyContent='center' marginTop={1} width='100%'>
          <Text dimColor>————————————————————————————————————————————————————————————————</Text>
        </Box>
      )}
    </Box>
  );
};
