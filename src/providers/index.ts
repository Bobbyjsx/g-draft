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
  prewarm?(modelId?: string): Promise<void>;
  dispose?(): Promise<void>;
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
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        handlers.onText(chunk.toString());
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    try {
      await child;
    } catch (e: any) {
      handlers.onError?.(stderr || e.message);
      throw e;
    }
  }

  async prewarm(_modelId?: string): Promise<void> {}
  async dispose(): Promise<void> {}
}

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  command = 'gemini';
  installGuide = 'npm install -g @google/gemini-cli';
  protected nonInteractiveFlags = ['--acp'];

  private child: any | null = null;
  private sessionId: string | null = null;
  private requestId = 1;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private stderr = '';
  private thoughtQueue: string[] = [];
  private isTyping = false;
  private currentHandlers: StreamHandlers | null = null;
  private streamResolver: (() => void) | null = null;
  private streamRejecter: ((err: any) => void) | null = null;
  private isPrewarming = false;
  private prewarmPromise: Promise<void> | null = null;
  private turnFinished = false;

  async run(prompt: string): Promise<string> {
    let result = '';
    await this.stream(prompt, {
      onText: (text) => {
        result += text;
      },
    });
    return result;
  }

  async prewarm(modelId = 'auto-gemini-3'): Promise<void> {
    if (this.child) return;
    if (this.isPrewarming) return this.prewarmPromise || Promise.resolve();

    this.isPrewarming = true;
    this.prewarmPromise = (async () => {
      this.child = execa(this.command, this.nonInteractiveFlags, {
        stderr: 'pipe',
        stdin: 'pipe',
        stdout: 'pipe',
      });

      this.setupListeners();

      try {
        const initId = this.requestId++;
        const sessId = this.requestId++;

        const initPromise = new Promise((resolve, reject) => {
          this.pendingRequests.set(initId, { reject, resolve });
        });
        const sessionPromise = new Promise((resolve, reject) => {
          this.pendingRequests.set(sessId, { reject, resolve });
        });

        const batch = [
          JSON.stringify({
            id: initId,
            jsonrpc: '2.0',
            method: 'initialize',
            params: { clientInfo: { name: 'gdraft', version: '1.0.0' }, protocolVersion: 1 },
          }),
          JSON.stringify({ jsonrpc: '2.0', method: 'initialized', params: {} }),
          JSON.stringify({
            id: sessId,
            jsonrpc: '2.0',
            method: 'session/new',
            params: {
              cwd: process.cwd(),
              mcpServers: [],
              modelId,
            },
          }),
        ].join('\n');

        this.child.stdin?.write(`${batch}\n`);

        await initPromise;
        const session: any = await sessionPromise;
        this.sessionId = session.sessionId;
      } catch (err) {
        await this.dispose();
        throw err;
      } finally {
        this.isPrewarming = false;
        this.prewarmPromise = null;
      }
    })();

    return this.prewarmPromise;
  }

  async dispose(): Promise<void> {
    if (this.child) {
      this.child.kill();
      this.child = null;
      this.sessionId = null;
      this.isPrewarming = false;
      this.prewarmPromise = null;
    }
  }

  private setupListeners() {
    if (!this.child) return;

    let buffer = '';

    this.child.stderr?.on('data', (chunk: any) => {
      this.stderr += chunk.toString();
    });

    this.child.stdout?.on('data', (chunk: any) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim().startsWith('{')) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined) {
            const pending = this.pendingRequests.get(msg.id);
            if (pending) {
              this.pendingRequests.delete(msg.id);
              if (msg.error) {
                pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
              } else {
                pending.resolve(msg.result);
              }
            }
          } else if (msg.method === 'session/update') {
            const update = msg.params?.update;
            if (update?.sessionUpdate === 'agent_message_chunk') {
              const text = update.content?.text;
              if (text) this.currentHandlers?.onText(text);
            } else if (update?.sessionUpdate === 'agent_thought_chunk') {
              const text = update.content?.text;
              if (text) {
                this.thoughtQueue.push(...text.split(''));
                this.processThoughtQueue();
              }
            } else if (update?.sessionUpdate === 'tool_call') {
              const toolName = update.title || 'tool';
              this.thoughtQueue.push(...`\n[Action: ${toolName}]\n`.split(''));
              this.processThoughtQueue();
            } else if (update?.sessionUpdate === 'tool_call_update') {
              if (update.status === 'completed') {
                this.thoughtQueue.push(...' ✓ Done\n'.split(''));
                this.processThoughtQueue();
              }
            }
          }
        } catch (_e) {
          // Ignore parse errors for non-JSON lines
        }
      }
    });

    this.child.on('close', (code: number) => {
      if (code !== 0 && this.streamRejecter) {
        this.streamRejecter(new Error(this.stderr || `Process exited with code ${code}`));
      } else if (this.streamResolver) {
        if (!this.isTyping) this.streamResolver();
      }
      this.child = null;
      this.sessionId = null;
      this.isPrewarming = false;
      this.prewarmPromise = null;
    });

    this.child.on('error', (err: any) => {
      this.streamRejecter?.(err);
      this.dispose();
    });
  }

  private async processThoughtQueue() {
    if (this.isTyping) return;
    this.isTyping = true;
    while (this.thoughtQueue.length > 0) {
      const char = this.thoughtQueue.shift();
      if (char) {
        this.currentHandlers?.onThought?.(char);
        await new Promise((r) => setTimeout(r, 5));
      }
    }
    this.isTyping = false;
    // Resolve if turn is finished or process closed, and queue is empty
    if ((this.turnFinished || !this.child) && this.streamResolver) {
      this.streamResolver();
    }
  }

  private sendRequest(method: string, params: any) {
    if (!this.child) throw new Error('Provider not initialized');
    const id = this.requestId++;
    const promise = new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { reject, resolve });
    });
    this.child.stdin?.write(`${JSON.stringify({ id, jsonrpc: '2.0', method, params })}\n`);
    return promise;
  }

  async stream(prompt: string, handlers: StreamHandlers, diffPath?: string): Promise<void> {
    const isOneShot = !this.child && !this.isPrewarming;
    if (isOneShot) {
      this.child = execa(this.command, this.nonInteractiveFlags, {
        stderr: 'pipe',
        stdin: 'pipe',
        stdout: 'pipe',
      });
      this.setupListeners();

      let input = '';
      if (diffPath && fs.existsSync(diffPath)) {
        input = fs.readFileSync(diffPath, 'utf8');
      }
      const fullPrompt = input ? `${input}\n\n${prompt}` : prompt;

      const initId = this.requestId++;
      const sessId = this.requestId++;

      const streamPromise = new Promise<void>((resolve, reject) => {
        this.streamResolver = resolve;
        this.streamRejecter = reject;
      });

      const initPromise = new Promise((resolve, reject) => {
        this.pendingRequests.set(initId, { reject, resolve });
      });
      const sessionPromise = new Promise((resolve, reject) => {
        this.pendingRequests.set(sessId, { reject, resolve });
      });

      const batch = [
        JSON.stringify({
          id: initId,
          jsonrpc: '2.0',
          method: 'initialize',
          params: { clientInfo: { name: 'gdraft', version: '1.0.0' }, protocolVersion: 1 },
        }),
        JSON.stringify({ jsonrpc: '2.0', method: 'initialized', params: {} }),
        JSON.stringify({
          id: sessId,
          jsonrpc: '2.0',
          method: 'session/new',
          params: { cwd: process.cwd(), mcpServers: [] },
        }),
      ].join('\n');

      this.currentHandlers = handlers;
      this.turnFinished = false;
      this.child.stdin?.write(`${batch}\n`);

      try {
        await initPromise;
        const session: any = await sessionPromise;
        this.sessionId = session.sessionId;

        await this.sendRequest('session/prompt', {
          prompt: [{ text: fullPrompt, type: 'text' }],
          sessionId: this.sessionId,
        });

        this.turnFinished = true;
        if (!this.isTyping && this.thoughtQueue.length === 0) {
          this.streamResolver?.();
        }

        if (this.child) {
          this.child.stdin?.end();
        }
        await streamPromise;
      } catch (err) {
        this.streamRejecter?.(err);
        await this.dispose();
        throw err;
      }
      return;
    }

    if (this.isPrewarming) await this.prewarmPromise;
    if (!this.child) await this.prewarm();

    this.currentHandlers = handlers;
    this.stderr = '';
    this.turnFinished = false;

    let input = '';
    if (diffPath && fs.existsSync(diffPath)) {
      input = fs.readFileSync(diffPath, 'utf8');
    }
    const fullPrompt = input ? `${input}\n\n${prompt}` : prompt;

    try {
      const streamPromise = new Promise<void>((resolve, reject) => {
        this.streamResolver = resolve;
        this.streamRejecter = reject;
      });

      await this.sendRequest('session/prompt', {
        prompt: [{ text: fullPrompt, type: 'text' }],
        sessionId: this.sessionId,
      });

      this.turnFinished = true;
      if (!this.isTyping && this.thoughtQueue.length === 0) {
        this.streamResolver?.();
      }

      await streamPromise;
    } catch (err: any) {
      handlers.onError?.(err.message);
      throw err;
    } finally {
      this.currentHandlers = null;
      this.streamResolver = null;
      this.streamRejecter = null;
      this.turnFinished = false;
    }
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
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        handlers.onText(chunk.toString());
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    try {
      await child;
    } catch (e: any) {
      handlers.onError?.(stderr || e.message);
      throw e;
    }
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
