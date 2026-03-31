import chalk from 'chalk';
import { Command } from 'commander';
import { ALL_PROVIDERS } from '../../providers/index.js';

export const providersCommand = () => {
  return new Command('providers').description('List available AI providers').action(async () => {
    console.log(chalk.blue('Available AI Providers:\n'));

    for (const provider of ALL_PROVIDERS) {
      const available = await provider.isAvailable();
      const status = available ? chalk.green('✓ Available') : chalk.red('✗ Not Found');

      console.log(`${chalk.bold(provider.name.padEnd(12))} ${status}`);
      if (!available) {
        console.log(`   ${chalk.gray('Install:')} ${provider.installGuide}`);
      }
      console.log('');
    }
  });
};
