import chalk from 'chalk';
import { Command } from 'commander';
import { type ConfigManager, ConfigSchema } from '../../core/config.js';

export const configCommand = (configManager: ConfigManager) => {
  const config = new Command('config').description('Manage gdraft configuration');

  config
    .command('set <key> <value>')
    .description('Set a global configuration value')
    .action((key, value) => {
      try {
        // Validate key
        const validKeys = ConfigSchema.keyof().options;
        if (!validKeys.includes(key as any)) {
          console.error(chalk.red(`Error: Invalid config key '${key}'. Valid keys: ${validKeys.join(', ')}`));
          return;
        }

        configManager.setGlobalConfig(key as any, value);
        console.log(chalk.green(`Set global ${key} to ${value}`));
      } catch (e) {
        console.error(chalk.red('Error setting config:'), e);
      }
    });

  config
    .command('list')
    .description('List current configuration')
    .action(() => {
      const merged = configManager.getMergedConfig();
      console.log(chalk.blue('Current Configuration (Merged):'));
      console.log(JSON.stringify(merged, null, 2));
    });

  return config;
};
