import { BaseProvider } from './base.js';
import { CLIEngine } from './engines.js';

export class ClaudeProvider extends BaseProvider {
  name = 'claude';
  command = 'claude';
  installGuide = 'npm install -g @anthropic-ai/claude-code';
  protected nonInteractiveFlags = ['--print'];
  protected engine = new CLIEngine();

  protected supportsNativeSystemPrompt = true;

  protected applySystemPromptFlag(flags: string[], systemPrompt: string): string[] {
    return [...flags, '--system-prompt', systemPrompt];
  }
}
