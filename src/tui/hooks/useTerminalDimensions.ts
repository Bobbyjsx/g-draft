import { useStdout } from 'ink';

export const useTerminalDimensions = () => {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;
  const height = stdout?.rows || 24;

  return { height, width };
};
