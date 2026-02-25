/// <reference types="node" />
import {
  spawn,
  SpawnOptionsWithoutStdio,
  SpawnOptionsWithStdioTuple,
  StdioNull,
  StdioPipe
} from 'node:child_process';

const TIMEOUT = 2000;

function checkUnixCommandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('which', [command]);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

type Command = [string, Array<string>];

const WINDOWS_READ_COMMAND: Command = ['powershell', ['Get-Clipboard']];

const UNIX_READ_COMMANDS: Array<Command> = [
  ['wl-paste', []],
  ['xsel', ['--clipboard', '--output']],
  ['xclip', ['-selection', 'clipboard', '-o']],
  // wsl
  WINDOWS_READ_COMMAND
];

/**
 * Reads text from the clipboard.
 */
export function readText(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let proc;
    const options: SpawnOptionsWithoutStdio = {
      signal: AbortSignal.timeout(TIMEOUT)
    };

    if (process.platform === 'darwin') {
      proc = spawn('pbpaste', options);
    } else if (process.platform === 'win32') {
      proc = spawn(...WINDOWS_READ_COMMAND, options);
    } else {
      // Unix: check if a supported command is installed
      for (const [unixCommand, unixArgs] of UNIX_READ_COMMANDS) {
        const exists = await checkUnixCommandExists(unixCommand);
        if (exists) {
          proc = spawn(unixCommand, unixArgs, options);
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

const WINDOWS_WRITE_COMMAND: Command = ['clip', []];

const UNIX_WRITE_COMMANDS: Array<Command> = [
  ['wl-copy', []],
  ['xsel', ['--clipboard', '--input']],
  ['xclip', ['-selection', 'clipboard', '-i']],
  // wsl
  WINDOWS_WRITE_COMMAND
];

/**
 * Writes text to the clipboard.
 */
export function writeText(text: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let proc;
    const options: SpawnOptionsWithStdioTuple<StdioPipe, StdioNull, StdioNull> =
      {
        stdio: ['pipe', 'ignore', 'ignore'],
        signal: AbortSignal.timeout(TIMEOUT)
      };

    if (process.platform === 'darwin') {
      proc = spawn('pbcopy', options);
    } else if (process.platform === 'win32') {
      proc = spawn(...WINDOWS_WRITE_COMMAND, options);
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
