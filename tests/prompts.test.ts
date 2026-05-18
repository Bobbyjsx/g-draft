import { describe, expect, it } from 'vitest';
import { PROMPTS } from '../src/core/prompts.js';

describe('PROMPTS', () => {
  it('should include CURRENT ACTION in COMMIT prompt', () => {
    const prompt = PROMPTS.COMMIT('some-diff');
    expect(prompt).toContain('CURRENT ACTION: Generating a Commit Message');
    expect(prompt).toContain('some-diff');
  });

  it('should include CURRENT ACTION in PR prompts', () => {
    const noTemplate = PROMPTS.PR_NO_TEMPLATE('some-diff');
    const withTemplate = PROMPTS.PR_WITH_TEMPLATE('template', 'some-diff');

    expect(noTemplate).toContain('CURRENT ACTION: Generating a Pull Request Description');
    expect(withTemplate).toContain('CURRENT ACTION: Filling a Pull Request Template');
  });

  it('should include CURRENT ACTION in REVIEW prompt', () => {
    const prompt = PROMPTS.REVIEW('some-diff');
    expect(prompt).toContain('CURRENT ACTION: Performing a Code Review (Audit)');
  });

  it('should include custom instructions when provided', () => {
    const options = { customInstructions: 'Use emoji everywhere' };
    const prompt = PROMPTS.COMMIT('diff', options);
    expect(prompt).toContain('Custom Rules:');
    expect(prompt).toContain('Use emoji everywhere');
  });
});
