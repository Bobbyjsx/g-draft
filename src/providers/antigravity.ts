import { BaseProvider } from './base.js';
import { CLIEngine } from './engines.js';

export class AntigravityProvider extends BaseProvider {
  name = 'antigravity';
  command = 'agy';
  installGuide = 'curl -fsSL https://antigravity.google/cli/install.sh | bash';
  protected nonInteractiveFlags = ['--dangerously-skip-permissions', '--print'];
  protected disableStdin = true;
  protected engine = new CLIEngine({ parseThoughts: true });

  decoratePrompt(prompt: string): string {
    const instruction =
      '\n\nCRITICAL: You must wrap your thoughts, plans, and intermediate progress inside <thought> and </thought> tags. The final output (e.g., the commit message, PR description, or code review) must be placed outside the tags at the very end.';
    return prompt + instruction;
  }
}
