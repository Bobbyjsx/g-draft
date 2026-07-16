import { EventEmitter } from 'node:events';
import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaudeProvider, CodexProvider, GeminiProvider, KiroProvider } from '../src/providers/index.js';

vi.mock('execa');
vi.mock('node:fs', () => ({
  default: {
    existsSync: () => false,
    readFileSync: () => '',
  },
}));

describe('AI Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockChild = () => {
    const child = new EventEmitter() as any;
    child.stdin = { end: vi.fn(), write: vi.fn() };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = vi.fn();
    return child;
  };

  describe('GeminiProvider', () => {
    it('should perform pipelined handshake', async () => {
      const provider = new GeminiProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const prewarmPromise = provider.prewarm();

      // Verify pipelined batch write
      expect(child.stdin.write).toHaveBeenCalled();
      const firstWrite = child.stdin.write.mock.calls[0][0];
      expect(firstWrite).toContain('"method":"initialize"');
      expect(firstWrite).toContain('"method":"session/new"');

      child.stdout.emit('data', `${JSON.stringify({ id: 1, jsonrpc: '2.0', result: {} })}\n`);
      child.stdout.emit('data', `${JSON.stringify({ id: 2, jsonrpc: '2.0', result: { sessionId: 'sid' } })}\n`);

      await prewarmPromise;
    });

    it('should stream thoughts and text with typing effect', async () => {
      // Use getProvider to get the singleton (or just a new one for test isolation if preferred)
      // For testing, new GeminiProvider() is fine as long as it's isolated.
      const provider = new GeminiProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const prewarmPromise = provider.prewarm();
      child.stdout.emit('data', `${JSON.stringify({ id: 1, jsonrpc: '2.0', result: {} })}\n`);
      child.stdout.emit('data', `${JSON.stringify({ id: 2, jsonrpc: '2.0', result: { sessionId: 'sid' } })}\n`);
      await prewarmPromise;

      const handlers = { onText: vi.fn(), onThought: vi.fn() };
      const streamPromise = provider.stream('hello', handlers);

      // We need to wait a tick for the queue to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      child.stdout.emit(
        'data',
        `${JSON.stringify({
          jsonrpc: '2.0',
          method: 'session/update',
          params: { update: { content: { text: 'T' }, sessionUpdate: 'agent_thought_chunk' } },
        })}\n`
      );

      child.stdout.emit(
        'data',
        `${JSON.stringify({
          jsonrpc: '2.0',
          method: 'session/update',
          params: { update: { content: { text: 'Final' }, sessionUpdate: 'agent_message_chunk' } },
        })}\n`
      );

      child.stdout.emit('data', `${JSON.stringify({ id: 3, jsonrpc: '2.0', result: {} })}\n`);

      await streamPromise;

      expect(handlers.onText).toHaveBeenCalledWith('Final');
      expect(handlers.onThought).toHaveBeenCalledWith('T');
    });

    it('should handle one-shot mode with batching', async () => {
      const provider = new GeminiProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const handlers = { onText: vi.fn() };
      const streamPromise = provider.stream('detached', handlers);

      await new Promise((resolve) => setTimeout(resolve, 10));

      child.stdout.emit('data', `${JSON.stringify({ id: 1, jsonrpc: '2.0', result: {} })}\n`);
      child.stdout.emit('data', `${JSON.stringify({ id: 2, jsonrpc: '2.0', result: { sessionId: 'sid' } })}\n`);

      await new Promise((resolve) => setTimeout(resolve, 10));

      child.stdout.emit('data', `${JSON.stringify({ id: 3, jsonrpc: '2.0', result: {} })}\n`);
      child.emit('close', 0);

      await streamPromise;
      expect(child.stdin.write).toHaveBeenCalledTimes(2); // One for batch, one for prompt
    });

    it('should prepend system prompt to the main prompt when not supported natively', async () => {
      const provider = new GeminiProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const prewarmPromise = provider.prewarm();
      child.stdout.emit('data', `${JSON.stringify({ id: 1, jsonrpc: '2.0', result: {} })}\n`);
      child.stdout.emit('data', `${JSON.stringify({ id: 2, jsonrpc: '2.0', result: { sessionId: 'sid' } })}\n`);
      await prewarmPromise;

      const handlers = { onText: vi.fn() };
      const streamPromise = provider.stream('hello', handlers, undefined, false, 'system instruction');

      // We need to wait a tick for the request to be registered
      await new Promise((resolve) => setTimeout(resolve, 0));

      child.stdout.emit('data', `${JSON.stringify({ id: 3, jsonrpc: '2.0', result: {} })}\n`);

      await streamPromise;

      // The prompt sent over session/prompt should be prepended
      const calls = child.stdin.write.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall.trim());
      expect(parsed.method).toBe('session/prompt');
      expect(parsed.params.prompt[0].text).toBe('system instruction\n\nhello');
    });
  });

  describe('CodexProvider', () => {
    it('should filter out raw echoed prompt and headers from thoughts', async () => {
      const provider = new CodexProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const handlers = { onText: vi.fn(), onThought: vi.fn() };
      const streamPromise = provider.stream('hello', handlers);

      child.stderr.emit('data', 'Reading additional input...\nOpenAI Codex\n--------\nuser\nhello\ncodex\n');
      child.stderr.emit('data', 'Running command: ls\n');
      child.stdout.emit('data', 'feat: initial commit');
      child.emit('close', 0);

      await streamPromise;
      expect(handlers.onText).toHaveBeenCalledWith('feat: initial commit');
      expect(handlers.onThought).not.toHaveBeenCalledWith(expect.stringContaining('user'));
      expect(handlers.onThought).toHaveBeenCalledWith('Running command: ls\n');
    });
  });

  describe('ClaudeProvider', () => {
    it('should use standard streaming', async () => {
      const provider = new ClaudeProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const handlers = { onText: vi.fn() };
      const streamPromise = provider.stream('hello', handlers);

      child.stdout.emit('data', 'Claude response');
      child.emit('close', 0);

      await streamPromise;
      expect(handlers.onText).toHaveBeenCalledWith('Claude response');
    });

    it('should pass system prompt as a flag', async () => {
      const provider = new ClaudeProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const handlers = { onText: vi.fn() };
      const streamPromise = provider.stream('hello', handlers, undefined, false, 'system instruction');

      child.stdout.emit('data', 'Claude response');
      child.emit('close', 0);

      await streamPromise;

      expect(vi.mocked(execa)).toHaveBeenCalledWith(
        'claude',
        ['--print', '--system-prompt', 'system instruction', 'hello'],
        expect.any(Object)
      );
    });
  });

  describe('KiroProvider', () => {
    it('should use standard streaming with kiro command', async () => {
      const provider = new KiroProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const handlers = { onText: vi.fn() };
      const streamPromise = provider.stream('hello', handlers);

      child.stdout.emit('data', '> \u001b[38;5;10mKiro response\u001b[0m');
      child.emit('close', 0);

      await streamPromise;
      expect(handlers.onText).toHaveBeenCalledWith('Kiro response');
      expect(vi.mocked(execa)).toHaveBeenCalledWith(
        'kiro-cli',
        ['chat', '--no-interactive', '--trust-all-tools', 'hello'],
        expect.any(Object)
      );
    });

    it('should correctly strip ANSI codes from prompt prefix to prevent streaming hangs', async () => {
      const provider = new KiroProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const handlers = { onText: vi.fn() };
      const streamPromise = provider.stream('hello', handlers);

      // Kiro outputs ANSI codes around the prompt prefix, which broke detection
      child.stdout.emit('data', '\u001b[38;5;141m> \u001b[0mAnsi encoded response\u001b[0m');
      child.emit('close', 0);

      await streamPromise;
      expect(handlers.onText).toHaveBeenCalledWith('Ansi encoded response');
    });
  });
});
