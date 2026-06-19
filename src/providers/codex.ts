import { BaseProvider } from './base.js';
import { CLIEngine } from './engines.js';

export class CodexProvider extends BaseProvider {
  name = 'codex';
  command = 'codex';
  installGuide = 'Check OpenAI Codex CLI installation instructions.';
  protected nonInteractiveFlags = ['exec', '--ephemeral'];
  protected engine = new CLIEngine({ filterCodexStderr: true });

  protected supportsNativeSystemPrompt = false;
}
