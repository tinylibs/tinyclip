/// <reference types="node" />
import {
  spawn,
  SpawnOptionsWithStdioTuple,
  StdioNull,
  StdioPipe
} from 'node:child_process';

function checkUnixCommandExists(command: string): Promise<boolean> {
  console.log(command);
  return new Promise((resolve) => {
    const proc = spawn('which', [command]);
    let data = '';
    proc.stdout.on('data', (chunk) => (data += chunk));
    proc.on('error', (err) => {
      console.log(err);
      resolve(false);
    });
    proc.on('close', (code) => {
      console.log({code, data});
      resolve(code === 0);
    });
  });
}

export function readText(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let proc;
    if (process.platform === 'darwin') {
      proc = spawn('pbpaste');
    } else if (process.platform === 'win32') {
      proc = spawn('powershell', ['Get-Clipboard']);
    } else {
      // Unix: check if a supported command is installed
      const unixCommands: Array<[string, Array<string>]> = [
        ['xclip', ['-selection', 'clipboard', '-o']],
        ['xsel', ['--clipboard', '--output']],
        ['wl-paste', []]
      ];
      for (const [unixCommand, unixArgs] of unixCommands) {
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
      const unixCommands: Array<[string, Array<string>]> = [
        ['xclip', ['-selection', 'clipboard']],
        ['xsel', ['--clipboard', '--input']],
        ['wl-copy', []]
      ];
      for (const [unixCommand, unixArgs] of unixCommands) {
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
