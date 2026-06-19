import { BaseProvider } from './base.js';
import { ACPEngine } from './engines.js';

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  command = 'gemini';
  installGuide = 'npm install -g @google/gemini-cli';
  protected nonInteractiveFlags = ['--acp'];
  protected engine = new ACPEngine();
}
