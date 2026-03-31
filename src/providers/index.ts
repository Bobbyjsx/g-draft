import { execa } from 'execa';

export interface AIProvider {
  name: string;
  installGuide: string;
  isAvailable(): Promise<boolean>;
  run(prompt: string): Promise<string>;
}

export abstract class BaseProvider implements AIProvider {
  abstract name: string;
  abstract installGuide: string;
  protected abstract command: string;
  protected abstract nonInteractiveFlags: string[];

  async isAvailable(): Promise<boolean> {
    try {
      await execa('which', [this.command]);
      return true;
    } catch {
      return false;
    }
  }

  async run(prompt: string): Promise<string> {
    // Use specific flags to force non-interactive/headless mode
    // and pipe the prompt via stdin to avoid ENAMETOOLONG
    const { stdout } = await execa(this.command, this.nonInteractiveFlags, {
      input: prompt,
      // Ensure we don't accidentally inherit parent TTY which might trigger interactive behaviors
      stdin: 'pipe',
    });
    return stdout.trim();
  }
}

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  command = 'gemini';
  installGuide = 'npm install -g @google/gemini-cli';
  protected nonInteractiveFlags = ['--prompt', '']; // Headless mode, reads from stdin
}

export class ClaudeProvider extends BaseProvider {
  name = 'claude';
  command = 'claude';
  installGuide = 'npm install -g @anthropic-ai/claude-code';
  protected nonInteractiveFlags = ['--print', '']; // Non-interactive mode
}

export class CodexProvider extends BaseProvider {
  name = 'codex';
  command = 'codex';
  installGuide = 'Check OpenAI Codex CLI installation instructions.';
  protected nonInteractiveFlags = ['run', '-']; // Common pattern for stdin
}

export class AmazonQProvider extends BaseProvider {
  name = 'amazon-q';
  command = 'q';
  installGuide = 'Check Amazon Q Developer CLI installation instructions.';
  protected nonInteractiveFlags = ['chat', '--no-interactive'];

  async run(prompt: string): Promise<string> {
    const { stdout } = await execa(this.command, this.nonInteractiveFlags, { input: prompt });
    return stdout.trim();
  }
}

export function getProvider(name: string): AIProvider {
  switch (name) {
    case 'gemini':
      return new GeminiProvider();
    case 'claude':
      return new ClaudeProvider();
    case 'codex':
      return new CodexProvider();
    case 'amazon-q':
      return new AmazonQProvider();
    default:
      return new GeminiProvider();
  }
}

export const ALL_PROVIDERS = [new GeminiProvider(), new ClaudeProvider(), new CodexProvider(), new AmazonQProvider()];
