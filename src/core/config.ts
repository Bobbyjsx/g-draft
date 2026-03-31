import fs from 'node:fs';
import path from 'node:path';
import Conf from 'conf';
import { z } from 'zod';

export const ConfigSchema = z.object({
  baseBranch: z.string().default('master'),
  diffMode: z.enum(['auto', 'staged', 'branch']).default('auto'),
  provider: z.enum(['gemini', 'claude', 'codex', 'amazon-q']).default('gemini'),
});

export type Config = z.infer<typeof ConfigSchema>;

const GLOBAL_CONFIG_NAME = 'gdraft';
const PROJECT_CONFIG_NAME = '.gdraft.json';

export class ConfigManager {
  private globalConf: Conf<Config>;
  private projectPath: string;

  constructor(cwd: string = process.cwd()) {
    this.globalConf = new Conf({ projectName: GLOBAL_CONFIG_NAME });
    // Keep project config in project root for easy manual editing
    this.projectPath = path.join(cwd, PROJECT_CONFIG_NAME);
  }

  getGlobalConfig(): Config {
    return ConfigSchema.parse(this.globalConf.store);
  }

  getProjectConfig(): Partial<Config> {
    if (fs.existsSync(this.projectPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.projectPath, 'utf8'));
        return ConfigSchema.partial().parse(raw);
      } catch (e) {
        console.error(`Error reading project config: ${e}`);
      }
    }
    return {};
  }

  getMergedConfig(cliFlags: Partial<Config> = {}): Config {
    const global = this.getGlobalConfig();
    const project = this.getProjectConfig();

    return {
      ...global,
      ...project,
      ...cliFlags,
    };
  }

  setGlobalConfig(key: keyof Config, value: any) {
    this.globalConf.set(key, value);
  }

  setProjectConfig(config: Partial<Config>) {
    fs.writeFileSync(this.projectPath, JSON.stringify(config, null, 2));
  }
}
