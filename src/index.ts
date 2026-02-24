/// <reference types="node" />
import {
  spawn,
  SpawnOptionsWithStdioTuple,
  StdioNull,
  StdioPipe
} from 'node:child_process';

export async function readText(): Promise<string> {
  return new Promise((resolve, reject) => {
    let proc;
    if (process.platform === 'darwin') {
      proc = spawn('pbpaste');
    } else if (process.platform === 'win32') {
      proc = spawn('powershell', ['Get-Clipboard']);
    } else {
      proc =
        spawn('xclip', ['-selection', 'clipboard', '-o']) ||
        spawn('xsel', ['--clipboard', '--output']) ||
        spawn('wl-paste');
    }

    if (!proc) return reject(new Error('No clipboard tool found'));

    let data = '';
    proc.stdout.on('data', (chunk) => (data += chunk));
    proc.on('error', (cause) =>
      reject(new Error('An error occurred while copying', {cause}))
    );
    proc.on('close', (code) =>
      code === 0
        ? resolve(data.trim())
        : reject(new Error('An unknown error occurred while copying'))
    );
  });
}

export async function writeText(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let proc;
    const options: SpawnOptionsWithStdioTuple<StdioPipe, StdioNull, StdioNull> =
      {stdio: ['pipe', 'ignore', 'ignore']};

    if (process.platform === 'darwin') {
      proc = spawn('pbcopy', options);
    } else if (process.platform === 'win32') {
      proc = spawn('clip', options);
    } else {
      proc =
        spawn('xclip', ['-selection', 'clipboard'], options) ||
        spawn('xsel', ['--clipboard', '--input'], options) ||
        spawn('wl-copy', options);
    }

    if (!proc) return reject(new Error('No clipboard tool found'));

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
