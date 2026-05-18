import { EventEmitter } from 'node:events';
import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaudeProvider, GeminiProvider } from '../src/providers/index.js';

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

      child.stdout.emit('data', JSON.stringify({ id: 1, jsonrpc: '2.0', result: {} }) + '\n');
      child.stdout.emit('data', JSON.stringify({ id: 2, jsonrpc: '2.0', result: { sessionId: 'sid' } }) + '\n');

      await prewarmPromise;
    });

    it('should stream thoughts and text with typing effect', async () => {
      const provider = new GeminiProvider();
      const child = createMockChild();
      (vi.mocked(execa) as any).mockReturnValue(child);

      const prewarmPromise = provider.prewarm();
      child.stdout.emit('data', JSON.stringify({ id: 1, jsonrpc: '2.0', result: {} }) + '\n');
      child.stdout.emit('data', JSON.stringify({ id: 2, jsonrpc: '2.0', result: { sessionId: 'sid' } }) + '\n');
      await prewarmPromise;

      const handlers = { onText: vi.fn(), onThought: vi.fn() };
      const streamPromise = provider.stream('hello', handlers);

      child.stdout.emit(
        'data',
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'session/update',
          params: { update: { content: { text: 'T' }, sessionUpdate: 'agent_thought_chunk' } },
        }) + '\n'
      );

      child.stdout.emit(
        'data',
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'session/update',
          params: { update: { content: { text: 'Final' }, sessionUpdate: 'agent_message_chunk' } },
        }) + '\n'
      );

      child.stdout.emit('data', JSON.stringify({ id: 3, jsonrpc: '2.0', result: {} }) + '\n');

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

      await new Promise((resolve) => setImmediate(resolve));

      child.stdout.emit('data', JSON.stringify({ id: 1, jsonrpc: '2.0', result: {} }) + '\n');
      child.stdout.emit('data', JSON.stringify({ id: 2, jsonrpc: '2.0', result: { sessionId: 'sid' } }) + '\n');

      await new Promise((resolve) => setImmediate(resolve));

      child.stdout.emit('data', JSON.stringify({ id: 3, jsonrpc: '2.0', result: {} }) + '\n');
      child.emit('close', 0);

      await streamPromise;
      expect(child.stdin.write).toHaveBeenCalledTimes(2); // One for batch, one for prompt
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
  });
});
