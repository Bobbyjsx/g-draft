import { execa } from 'execa';
import type { AIEngine, AIProvider, StreamHandlers } from './types.js';

export abstract class BaseProvider implements AIProvider {
  abstract name: string;
  abstract installGuide: string;
  protected abstract command: string;
  protected abstract nonInteractiveFlags: string[];
  protected abstract engine: AIEngine;
  protected disableStdin = false;

  async isAvailable(): Promise<boolean> {
    try {
      await execa('which', [this.command]);
      await execa(this.command, ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  protected supportsNativeSystemPrompt = false;

  protected applySystemPromptFlag(flags: string[], _systemPrompt: string): string[] {
    return flags;
  }

  async run(prompt: string, handlers?: Partial<StreamHandlers>, systemPrompt?: string): Promise<string> {
    let result = '';
    await this.stream(
      prompt,
      {
        onError: handlers?.onError,
        onText: (text) => {
          result += text;
          handlers?.onText?.(text);
        },
        onThought: handlers?.onThought,
      },
      undefined,
      true,
      systemPrompt
    );
    return result;
  }

  async stream(
    prompt: string,
    handlers: StreamHandlers,
    diffPath?: string,
    isInternal = false,
    systemPrompt?: string
  ): Promise<void> {
    let finalPrompt = prompt;
    let flags = [...this.nonInteractiveFlags];

    if (systemPrompt) {
      if (this.supportsNativeSystemPrompt) {
        flags = this.applySystemPromptFlag(flags, systemPrompt);
      } else {
        finalPrompt = `${systemPrompt}\n\n${prompt}`;
      }
    }

    await this.engine.stream(
      finalPrompt,
      handlers,
      { command: this.command, disableStdin: this.disableStdin, nonInteractiveFlags: flags },
      diffPath,
      isInternal
    );
  }

  async prewarm(modelId?: string): Promise<void> {
    if (this.engine.prewarm) {
      await this.engine.prewarm(modelId, {
        command: this.command,
        disableStdin: this.disableStdin,
        nonInteractiveFlags: this.nonInteractiveFlags,
      });
    }
  }

  async dispose(): Promise<void> {
    if (this.engine.dispose) {
      await this.engine.dispose();
    }
  }

  getModel(): string {
    const engineModel = this.engine.getModel ? this.engine.getModel() : 'default';
    return engineModel === 'default' ? this.name : `${this.name} (${engineModel})`;
  }
}
