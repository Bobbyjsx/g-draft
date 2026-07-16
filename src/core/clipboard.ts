import { execa } from 'execa';

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      await execa('pbcopy', { input: text });
      return true;
    }

    if (process.platform === 'win32') {
      await execa(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          '[Console]::InputEncoding=[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $input | Set-Clipboard',
        ],
        { input: text }
      );
      return true;
    }

    if (process.platform === 'linux') {
      try {
        await execa('xclip', ['-selection', 'clipboard'], { input: text });
        return true;
      } catch {
        await execa('xsel', ['--clipboard', '--input'], { input: text });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
