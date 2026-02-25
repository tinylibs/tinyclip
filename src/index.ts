/// <reference types="node" />
import {spawn} from 'node:child_process';

const TIMEOUT = 2000;

function checkUnixCommandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('which', [command]);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

type Command = [string, Array<string>];

async function getReadCommand(): Promise<Command | undefined> {
  switch (process.platform) {
    case 'darwin':
      return ['pbpaste', []];
    case 'win32':
      return ['powershell', ['Get-Clipboard']];
    case 'linux':
    case 'freebsd':
    case 'openbsd':
      if (process.env.WAYLAND_DISPLAY) {
        return ['wl-paste', []];
      }
      if (process.env.WSL_DISTRO_NAME) {
        return ['powershell.exe', ['-noprofile', '-command', 'Get-Clipboard']];
      }
      if (await checkUnixCommandExists('xsel')) {
        return ['xsel', ['--clipboard', '--output']];
      }
      return ['xclip', ['-selection', 'clipboard', '-o']];
    case 'android':
      return ['termux-clipboard-get', []];
    default:
      return undefined;
  }
}

/**
 * Reads text from the clipboard.
 */
export function readText(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const command = await getReadCommand();
    if (!command) {
      return reject(new Error('No clipboard tool found'));
    }

    const proc = spawn(...command, {
      signal: AbortSignal.timeout(TIMEOUT)
    });

    let data = '';
    proc.stdout.on('data', (chunk) => (data += chunk));
    proc.on('error', (cause) =>
      reject(
        new Error('An error occurred while reading from clipboard', {cause})
      )
    );
    proc.on('close', (code) =>
      code === 0
        ? resolve(data.trim())
        : reject(
            new Error('An unknown error occurred while reading from clipboard')
          )
    );
  });
}

async function getWriteCommand(): Promise<Command | undefined> {
  switch (process.platform) {
    case 'darwin':
      return ['pbcopy', []];
    case 'win32':
      return ['clip', []];
    case 'linux':
    case 'freebsd':
    case 'openbsd':
      if (process.env.WSL_DISTRO_NAME) {
        return ['clip.exe', []];
      }
      if (process.env.WAYLAND_DISPLAY) {
        return ['wl-copy', []];
      }
      if (await checkUnixCommandExists('xsel')) {
        return ['xsel', ['--clipboard', '--input']];
      }
      return ['xclip', ['-selection', 'clipboard', '-i']];
    case 'android':
      return ['termux-clipboard-set', []];
    default:
      return undefined;
  }
}

/**
 * Writes text to the clipboard.
 */
export function writeText(text: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const command = await getWriteCommand();
    if (!command) {
      return reject(new Error('No clipboard tool found'));
    }

    const proc = spawn(...command, {
      stdio: ['pipe', 'ignore', 'ignore'],
      signal: AbortSignal.timeout(TIMEOUT)
    });

    proc.on('error', (cause) =>
      reject(new Error('An error occurred while copying', {cause}))
    );
    proc.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error('An unknown error occurred while copying'))
    );

    proc.stdin.write(text);
    proc.stdin.end();
  });
}
