import type React from 'react';
import { useEffect, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import latestVersion from 'latest-version';
import semver from 'semver';
import { paths } from '../../core/paths.js';
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

  const showBigText = width > 85 && height > 22;
  const showDoubleBorder = height > 18;
  const showDecorator = height > 28;

  return (
    <Box alignItems='center' flexDirection='column' marginBottom={height > 18 ? 1 : 0} width='100%'>
      <Box
        alignItems='center'
        borderColor='cyan'
        borderStyle={showDoubleBorder ? 'double' : 'single'}
        flexDirection='column'
        paddingX={width > 60 ? 4 : 1}
        paddingY={height > 22 ? 1 : 0}
      >
        {showBigText ? (
          <Gradient name='atlas'>
            <BigText font='tiny' text='G-DRAFT' />
          </Gradient>
        ) : (
          <Box paddingX={2}>
            <Text bold color='cyan'>
              G · D · R · A · F · T
            </Text>
          </Box>
        )}

        <Box alignItems='center' flexDirection='column' marginTop={showBigText ? 1 : 0}>
          <Text color='cyan'>AI-Powered Git Assistant · v{pkg.version}</Text>
          {height > 12 && (
            <Text color='gray' dimColor>
              Project ID: <Text color='magenta'>{paths.getProjectId()}</Text>
            </Text>
          )}
        </Box>
      </Box>

      {newVersion && height > 12 && (
        <Box marginTop={1} paddingX={2}>
          <Text color='yellow'>
            ✨ Update available: {pkg.version} → {newVersion} · Run `npm i -g g-draft`
          </Text>
        </Box>
      )}

      {showDecorator && (
        <Box justifyContent='center' marginTop={1} width='100%'>
          <Text dimColor>————————————————————————————————————————————————</Text>
        </Box>
      )}
    </Box>
  );
};
