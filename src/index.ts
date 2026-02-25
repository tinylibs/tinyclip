/// <reference types="node" />
import {
  spawn,
  SpawnOptionsWithStdioTuple,
  StdioNull,
  StdioPipe
} from 'node:child_process';

function checkUnixCommandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('which', [command]);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

const UNIX_READ_COMMANDS: Array<[string, Array<string>]> = [
  ['xclip', ['-selection', 'clipboard', '-o']],
  ['xsel', ['--clipboard', '--output']],
  ['wl-paste', []]
];

const UNIX_WRITE_COMMANDS: Array<[string, Array<string>]> = [
  ['xclip', ['-selection', 'clipboard']],
  ['xsel', ['--clipboard', '--input']],
  ['wl-copy', []]
];

export function readText(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let proc;
    if (process.platform === 'darwin') {
      proc = spawn('pbpaste');
    } else if (process.platform === 'win32') {
      proc = spawn('powershell', ['Get-Clipboard']);
    } else {
      // Unix: check if a supported command is installed
      for (const [unixCommand, unixArgs] of UNIX_READ_COMMANDS) {
        const exists = await checkUnixCommandExists(unixCommand);
        if (exists) {
          proc = spawn(unixCommand, unixArgs);
          break;
        }
      }
    }

    if (!proc) return reject(new Error('No clipboard tool found'));

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

export function writeText(text: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let proc;
    const options: SpawnOptionsWithStdioTuple<StdioPipe, StdioNull, StdioNull> =
      {stdio: ['pipe', 'ignore', 'ignore']};

    if (process.platform === 'darwin') {
      proc = spawn('pbcopy', options);
    } else if (process.platform === 'win32') {
      proc = spawn('clip', options);
    } else {
      // Unix: check if a supported command is installed
      for (const [unixCommand, unixArgs] of UNIX_WRITE_COMMANDS) {
        const exists = await checkUnixCommandExists(unixCommand);
        if (exists) {
          proc = spawn(unixCommand, unixArgs, options);
          break;
        }
      }
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
