import { EventEmitter } from 'node:events';
import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROMPTS } from '../src/core/prompts.js';
import { GeminiProvider } from '../src/providers/index.js';

vi.mock('execa');
vi.mock('node:fs', () => ({
  default: {
    existsSync: () => false,
    readFileSync: () => '',
  },
}));

describe('Generation Flow Integration', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeminiProvider();
  });

  const createMockChild = () => {
    const child = new EventEmitter() as any;
    child.stdin = { end: vi.fn(), write: vi.fn() };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = vi.fn();
    return child;
  };

  const simulateACPStream = async (child: any, thoughts: string[], text: string[]) => {
    // 1. Handshake
    await new Promise((r) => setTimeout(r, 10));
    child.stdout.emit('data', JSON.stringify({ id: 1, jsonrpc: '2.0', result: {} }) + '\n');
    await new Promise((r) => setTimeout(r, 10));
    child.stdout.emit(
      'data',
      JSON.stringify({ id: 2, jsonrpc: '2.0', result: { modelId: 'gemini-3-flash', sessionId: 'sid' } }) + '\n'
    );

    // 2. Thoughts
    for (const thought of thoughts) {
      await new Promise((r) => setTimeout(r, 10));
      child.stdout.emit(
        'data',
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'session/update',
          params: { update: { content: { text: thought }, sessionUpdate: 'agent_thought_chunk' } },
        }) + '\n'
      );
    }

    // 3. Text
    for (const t of text) {
      await new Promise((r) => setTimeout(r, 10));
      child.stdout.emit(
        'data',
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'session/update',
          params: { update: { content: { text: t }, sessionUpdate: 'agent_message_chunk' } },
        }) + '\n'
      );
    }

    // 4. Done
    await new Promise((r) => setTimeout(r, 10));
    child.stdout.emit('data', JSON.stringify({ id: 3, jsonrpc: '2.0', result: {} }) + '\n');
  };

  it('should complete a commit generation flow', async () => {
    const child = createMockChild();
    (vi.mocked(execa) as any).mockReturnValue(child);

    const handlers = {
      onText: vi.fn(),
      onThought: vi.fn(),
    };

    const prompt = PROMPTS.COMMIT('diff content');
    const streamPromise = provider.stream(prompt, handlers);

    await simulateACPStream(child, ['T'], ['feat: ok']);

    await streamPromise;

    expect(handlers.onText).toHaveBeenCalled();
    const fullResult = handlers.onText.mock.calls.map((c) => c[0]).join('');
    expect(fullResult).toBe('feat: ok');
  }, 10000);

  it('should complete a PR generation flow', async () => {
    const child = createMockChild();
    (vi.mocked(execa) as any).mockReturnValue(child);

    const handlers = {
      onText: vi.fn(),
      onThought: vi.fn(),
    };

    const prompt = PROMPTS.PR_NO_TEMPLATE('diff content');
    const streamPromise = provider.stream(prompt, handlers);

    await simulateACPStream(child, ['P'], ['# PR']);

    await streamPromise;

    const fullResult = handlers.onText.mock.calls.map((c) => c[0]).join('');
    expect(fullResult).toContain('# PR');
  }, 10000);

  it('should complete an audit generation flow', async () => {
    const child = createMockChild();
    (vi.mocked(execa) as any).mockReturnValue(child);

    const handlers = {
      onText: vi.fn(),
      onThought: vi.fn(),
    };

    const prompt = PROMPTS.REVIEW('diff content');
    const streamPromise = provider.stream(prompt, handlers);

    await simulateACPStream(child, ['A'], ['- Bug']);

    await streamPromise;

    const fullResult = handlers.onText.mock.calls.map((c) => c[0]).join('');
    expect(fullResult).toContain('Bug');
  }, 10000);
});
