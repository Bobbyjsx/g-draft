export interface StreamHandlers {
  onText: (text: string) => void;
  onThought?: (thought: string) => void;
  onError?: (error: string) => void;
}

export interface AIProvider {
  name: string;
  installGuide: string;
  isAvailable(): Promise<boolean>;
  run(prompt: string, handlers?: Partial<StreamHandlers>, systemPrompt?: string): Promise<string>;
  stream(prompt: string, handlers: StreamHandlers, diffPath?: string, isInternal?: boolean, systemPrompt?: string): Promise<void>;
  getModel?(): string;
  prewarm?(modelId?: string): Promise<void>;
  dispose?(): Promise<void>;
  decoratePrompt?(prompt: string): string;
}

export interface EngineOptions {
  command: string;
  nonInteractiveFlags: string[];
}

export interface AIEngine {
  stream(
    prompt: string,
    handlers: StreamHandlers,
    options: EngineOptions,
    diffPath?: string,
    isInternal?: boolean
  ): Promise<void>;
  prewarm?(modelId?: string, options?: EngineOptions): Promise<void>;
  dispose?(): Promise<void>;
  getModel?(): string;
}
