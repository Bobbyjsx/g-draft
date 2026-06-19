import { BaseProvider } from './base.js';
import { CLIEngine } from './engines.js';
import type { StreamHandlers } from './types.js';

function stripAnsi(str: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Standard ANSI escape code regex requires control characters
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export class KiroProvider extends BaseProvider {
  name = 'kiro';
  command = 'kiro-cli';
  installGuide = 'Check Kiro Developer CLI installation instructions.';
  protected nonInteractiveFlags = ['chat', '--no-interactive', '--trust-tools=fs_read,fs_find,grep_search'];
  protected engine = new CLIEngine();

  override async stream(
    prompt: string,
    handlers: StreamHandlers,
    diffPath?: string,
    isInternal = false,
    systemPrompt?: string
  ): Promise<void> {
    let seenResponseStart = false;
    let buffer = '';

    const wrappedHandlers: StreamHandlers = {
      ...handlers,
      onText: (text) => {
        if (seenResponseStart) {
          handlers.onText(stripAnsi(text));
          return;
        }

        buffer += text;
        const startIdx = buffer.indexOf('> ');
        if (startIdx !== -1) {
          seenResponseStart = true;
          const responsePart = buffer.substring(startIdx + 2);
          if (responsePart) {
            handlers.onText(stripAnsi(responsePart));
          }
          buffer = '';
        }
      },
    };

    await super.stream(prompt, wrappedHandlers, diffPath, isInternal, systemPrompt);

    if (!seenResponseStart && buffer) {
      handlers.onText(stripAnsi(buffer));
    }
  }
}
