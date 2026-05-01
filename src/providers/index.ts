import fs from 'node:fs';
import { execa } from 'execa';

export interface StreamHandlers {
  onText: (text: string) => void;
  onThought?: (thought: string) => void;
  onError?: (error: string) => void;
}

export interface AIProvider {
  name: string;
  installGuide: string;
  isAvailable(): Promise<boolean>;
  run(prompt: string): Promise<string>;
  stream(prompt: string, handlers: StreamHandlers, diffPath?: string): Promise<void>;
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
    const { stdout } = await execa(this.command, this.nonInteractiveFlags, {
      input: prompt,
      stdin: 'pipe',
    });
    return stdout.trim();
  }

  protected spawn(flags: string[], input: string) {
    return execa(this.command, flags, {
      input,
      stderr: 'pipe',
      stdin: 'pipe',
      stdout: 'pipe',
    });
  }

  async stream(prompt: string, handlers: StreamHandlers, diffPath?: string): Promise<void> {
    const flags = [...this.nonInteractiveFlags];
    let input = prompt;

    if (diffPath && fs.existsSync(diffPath)) {
      const diffContent = fs.readFileSync(diffPath, 'utf8');
      input = `${diffContent}\n\n${prompt}`;
    }

    const child = this.spawn(flags, input);

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        handlers.onText(chunk.toString());
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        handlers.onError?.(chunk.toString());
      });
    }

    await child;
  }
}

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  command = 'gemini';
  installGuide = 'npm install -g @google/gemini-cli';
  protected nonInteractiveFlags = [];

  async run(prompt: string): Promise<string> {
    const { stdout } = await this.spawn(['--prompt', prompt], '');
    return stdout.trim();
  }

  async stream(prompt: string, handlers: StreamHandlers, diffPath?: string): Promise<void> {
    const flags = ['--prompt', prompt];
    let input = '';

    if (diffPath && fs.existsSync(diffPath)) {
      input = fs.readFileSync(diffPath, 'utf8');
    }

    const child = this.spawn(flags, input);

    let inThought = false;

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        const data = chunk.toString();
        let remaining = data;

        // Simple state machine to handle <thought> tags across chunks
        while (remaining.length > 0) {
          if (!inThought) {
            const startIdx = remaining.indexOf('<thought>');
            if (startIdx !== -1) {
              // Text before thought
              if (startIdx > 0) {
                handlers.onText(remaining.slice(0, startIdx));
              }
              inThought = true;
              remaining = remaining.slice(startIdx + 9);
            } else {
              handlers.onText(remaining);
              remaining = '';
            }
          } else {
            const endIdx = remaining.indexOf('</thought>');
            if (endIdx !== -1) {
              // Thought content
              handlers.onThought?.(remaining.slice(0, endIdx));
              inThought = false;
              remaining = remaining.slice(endIdx + 10);
            } else {
              handlers.onThought?.(remaining);
              remaining = '';
            }
          }
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        handlers.onError?.(chunk.toString());
      });
    }

    await child;
  }
}

export class ClaudeProvider extends BaseProvider {
  name = 'claude';
  command = 'claude';
  installGuide = 'npm install -g @anthropic-ai/claude-code';
  protected nonInteractiveFlags = ['--print'];

  async run(prompt: string): Promise<string> {
    const { stdout } = await this.spawn([...this.nonInteractiveFlags, prompt], '');
    return stdout.trim();
  }

  async stream(prompt: string, handlers: StreamHandlers, diffPath?: string): Promise<void> {
    const flags = [...this.nonInteractiveFlags, prompt];
    let input = '';

    if (diffPath && fs.existsSync(diffPath)) {
      input = fs.readFileSync(diffPath, 'utf8');
    }

    const child = this.spawn(flags, input);

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        handlers.onText(chunk.toString());
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        handlers.onError?.(chunk.toString());
      });
    }

    await child;
  }
}

export class CodexProvider extends BaseProvider {
  name = 'codex';
  command = 'codex';
  installGuide = 'Check OpenAI Codex CLI installation instructions.';
  protected nonInteractiveFlags = ['run', '-'];
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
