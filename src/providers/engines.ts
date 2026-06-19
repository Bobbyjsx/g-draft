import fs from 'node:fs';
import { execa } from 'execa';
import type { AIEngine, EngineOptions, StreamHandlers } from './types.js';

export class ACPEngine implements AIEngine {
  private child: any | null = null;
  private sessionId: string | null = null;
  private modelId: string | null = null;
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
  private turnLock: Promise<void> = Promise.resolve();
  private isDisposing = false;

  private spawn(command: string, flags: string[]) {
    return execa(command, flags, {
      stderr: 'pipe',
      stdin: 'pipe',
      stdout: 'pipe',
    });
  }

  async prewarm(modelId = 'auto-gemini-3', options: EngineOptions): Promise<void> {
    if (this.child || this.isDisposing) return;
    if (this.isPrewarming) return this.prewarmPromise || Promise.resolve();

    this.isPrewarming = true;
    this.prewarmPromise = (async () => {
      this.child = this.spawn(options.command, options.nonInteractiveFlags);
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

        const init = await initPromise;
        const session: any = await sessionPromise;

        if (!init || !session || this.isDisposing) {
          return;
        }

        this.sessionId = session.sessionId;
        this.modelId = session.modelId || modelId;
      } catch (err) {
        if (!this.isDisposing) {
          await this.dispose();
          throw err;
        }
      } finally {
        this.isPrewarming = false;
        this.prewarmPromise = null;
      }
    })();

    return this.prewarmPromise;
  }

  async dispose(): Promise<void> {
    if (this.isDisposing) return;
    this.isDisposing = true;

    this.thoughtQueue = [];
    this.isTyping = false;
    this.currentHandlers = null;
    this.streamResolver = null;
    this.streamRejecter = null;

    if (this.child) {
      this.child.kill();
      this.child = null;
    }

    const cancellationError = new Error('AI Provider disposed during request');
    for (const [_id, pending] of this.pendingRequests) {
      try {
        pending.reject(cancellationError);
      } catch (_e) {}
    }
    this.pendingRequests.clear();

    this.sessionId = null;
    this.modelId = null;
    this.isPrewarming = false;
    this.prewarmPromise = null;
    this.turnFinished = false;
    this.isDisposing = false;
  }

  getModel(): string {
    return this.modelId || 'gemini-3-flash';
  }

  private setupListeners() {
    if (!this.child) return;

    let buffer = '';

    this.child.stderr?.on('data', (chunk: any) => {
      this.stderr += chunk.toString();
    });

    this.child.stdout?.on('data', (chunk: any) => {
      if (this.isDisposing) return;
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
                if (msg.result?.modelId) {
                  this.modelId = msg.result.modelId;
                }
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
            }
          }
        } catch (_e) {}
      }
    });

    this.child.on('close', (code: number) => {
      if (this.isDisposing) return;
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
      if (this.isDisposing) return;
      this.streamRejecter?.(err);
      this.dispose();
    });
  }

  private async processThoughtQueue() {
    if (this.isTyping || this.isDisposing) return;
    this.isTyping = true;
    try {
      while (this.thoughtQueue.length > 0 && !this.isDisposing) {
        const char = this.thoughtQueue.shift();
        if (char && this.currentHandlers?.onThought) {
          this.currentHandlers.onThought(char);
          await new Promise((r) => setTimeout(r, 1));
        }
      }
    } finally {
      this.isTyping = false;
      if ((this.turnFinished || !this.child) && this.streamResolver && this.thoughtQueue.length === 0) {
        this.streamResolver();
      }
    }
  }

  private sendRequest(method: string, params: any) {
    if (!this.child || this.isDisposing) return Promise.reject(new Error('Provider not available'));
    const id = this.requestId++;
    const promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} (id: ${id}) timed out after 600s`));
      }, 600000);

      this.pendingRequests.set(id, {
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val);
        },
      });
    });
    this.child.stdin?.write(`${JSON.stringify({ id, jsonrpc: '2.0', method, params })}\n`);
    return promise;
  }

  async stream(
    prompt: string,
    handlers: StreamHandlers,
    options: EngineOptions,
    diffPath?: string,
    isInternal = false
  ): Promise<void> {
    if (this.isDisposing) return;

    if (!isInternal) {
      await this.turnLock;
    }

    let releaseTurn = () => {};
    this.turnLock = new Promise((resolve) => {
      releaseTurn = resolve;
    });

    const isOneShot = !this.child && !this.isPrewarming;
    if (isOneShot) {
      this.child = this.spawn(options.command, options.nonInteractiveFlags);
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
      this.thoughtQueue = [];
      this.child.stdin?.write(`${batch}\n`);

      try {
        const init = await initPromise;
        const session: any = await sessionPromise;

        if (!init || !session || this.isDisposing) {
          releaseTurn?.();
          return;
        }

        this.sessionId = session.sessionId;
        this.modelId = session.modelId || 'default';

        await this.sendRequest('session/prompt', {
          prompt: [{ text: fullPrompt, type: 'text' }],
          sessionId: this.sessionId,
        });

        this.thoughtQueue.push(...'\n ✓ Done\n'.split(''));
        this.turnFinished = true;
        this.processThoughtQueue();

        if (this.child) {
          this.child.stdin?.end();
        }
        await streamPromise;
      } catch (err) {
        if (!this.isDisposing) {
          this.streamRejecter?.(err);
          await this.dispose();
          throw err;
        }
      } finally {
        releaseTurn?.();
      }
      return;
    }

    if (this.isPrewarming) await this.prewarmPromise;
    if (!this.child) await this.prewarm('default', options);

    this.currentHandlers = handlers;
    this.stderr = '';
    this.turnFinished = false;
    this.thoughtQueue = [];

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

      if (this.isDisposing) return;

      await this.sendRequest('session/prompt', {
        prompt: [{ text: fullPrompt, type: 'text' }],
        sessionId: this.sessionId,
      });

      this.thoughtQueue.push(...'\n ✓ Done\n'.split(''));
      this.turnFinished = true;
      this.processThoughtQueue();

      await streamPromise;
    } catch (err: any) {
      if (!this.isDisposing) {
        handlers.onError?.(err.message);
        throw err;
      }
    } finally {
      this.currentHandlers = null;
      this.streamResolver = null;
      this.streamRejecter = null;
      this.turnFinished = false;
      releaseTurn?.();
    }
  }
}

export class CLIEngine implements AIEngine {
  private child: any | null = null;
  private isDisposing = false;
  private parseThoughts: boolean;
  private filterCodexStderr: boolean;

  constructor(options: { parseThoughts?: boolean; filterCodexStderr?: boolean } = {}) {
    this.parseThoughts = options.parseThoughts ?? false;
    this.filterCodexStderr = options.filterCodexStderr ?? false;
  }

  async stream(
    prompt: string,
    handlers: StreamHandlers,
    options: EngineOptions,
    diffPath?: string,
    _isInternal?: boolean
  ): Promise<void> {
    if (this.isDisposing) return;

    let input = '';
    if (diffPath && fs.existsSync(diffPath)) {
      input = fs.readFileSync(diffPath, 'utf8');
    }

    const flags = [...options.nonInteractiveFlags, prompt];
    const child = execa(options.command, flags, {
      input,
      stderr: 'pipe',
      stdin: 'pipe',
      stdout: 'pipe',
    });
    this.child = child;

    let stderr = '';
    let inThought = false;

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        const data = chunk.toString();
        if (!this.parseThoughts) {
          handlers.onText(data);
          return;
        }

        let remaining = data;
        while (remaining.length > 0) {
          if (!inThought) {
            const startIdx = remaining.indexOf('<thought>');
            if (startIdx !== -1) {
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
      let seenCodexHeader = false;
      let stderrBuffer = '';

      child.stderr.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        stderr += chunkStr;

        if (!this.filterCodexStderr) {
          handlers.onThought?.(chunkStr);
          return;
        }

        if (seenCodexHeader) {
          handlers.onThought?.(chunkStr);
          return;
        }

        stderrBuffer += chunkStr;
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === 'codex') {
            seenCodexHeader = true;
            const remainingLines = lines.slice(i + 1).join('\n');
            const toSend = remainingLines + (remainingLines && stderrBuffer ? '\n' : '') + stderrBuffer;
            if (toSend) {
              handlers.onThought?.(toSend);
            }
            stderrBuffer = '';
            break;
          }
        }
      });
    }

    try {
      await child;
    } catch (e: any) {
      if (!this.isDisposing) {
        handlers.onError?.(stderr || e.message);
        throw e;
      }
    } finally {
      this.child = null;
    }
  }

  async dispose(): Promise<void> {
    this.isDisposing = true;
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    this.isDisposing = false;
  }
}
