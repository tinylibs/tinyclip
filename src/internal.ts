/// <reference types="node" />
import {spawn} from 'node:child_process';

interface SpawnProcess {
  on: <T extends 'error' | 'close'>(
    eventName: T,
    cb: (
      ...args: T extends 'error' ? [cause: Error] : [code: number | null]
    ) => void
  ) => void;
  stdin: {
    write: (text: string) => void;
    end: () => void;
  } | null;
  stdout: {
    on: (eventName: 'data', cb: (chunk: string) => void) => void;
  } | null;
}

interface ProcessSpawnerOptions {
  signal?: AbortSignal;
  stdio?: ['pipe', 'ignore', 'ignore'];
}

interface ProcessSpawner {
  spawn: (
    commmand: string,
    args: Array<string>,
    options: ProcessSpawnerOptions
  ) => SpawnProcess;
}

export class NodeProcessSpawner implements ProcessSpawner {
  spawn(
    commmand: string,
    args: Array<string>,
    options: ProcessSpawnerOptions
  ): SpawnProcess {
    return spawn(commmand, args, options);
  }
}

const TIMEOUT = 2000;

function checkUnixCommandExists({
  command,
  processSpawner
}: {
  command: string;
  processSpawner: ProcessSpawner;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = processSpawner.spawn('which', [command], {});
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

export function readTextInternal({
  processSpawner,
  platform
}: {
  processSpawner: ProcessSpawner;
  platform: NodeJS.Platform;
}): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let proc;
    const options: ProcessSpawnerOptions = {
      signal: AbortSignal.timeout(TIMEOUT)
    };

    if (platform === 'darwin') {
      proc = processSpawner.spawn('pbpaste', [], options);
    } else if (platform === 'win32') {
      proc = processSpawner.spawn(...WINDOWS_READ_COMMAND, options);
    } else {
      // Unix: check if a supported command is installed
      for (const [command, args] of UNIX_READ_COMMANDS) {
        const exists = await checkUnixCommandExists({
          command,
          processSpawner
        });
        if (exists) {
          proc = processSpawner.spawn(command, args, options);
          break;
        }
      }
    }

    if (!proc) return reject(new Error('No clipboard tool found'));

    let data = '';
    proc.stdout?.on('data', (chunk) => (data += chunk));
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

export function writeTextInternal({
  text,
  processSpawner,
  platform
}: {
  text: string;
  processSpawner: ProcessSpawner;
  platform: NodeJS.Platform;
}): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let proc;
    const options: ProcessSpawnerOptions = {
      stdio: ['pipe', 'ignore', 'ignore'],
      signal: AbortSignal.timeout(TIMEOUT)
    };

    if (platform === 'darwin') {
      proc = processSpawner.spawn('pbcopy', [], options);
    } else if (platform === 'win32') {
      proc = processSpawner.spawn(...WINDOWS_WRITE_COMMAND, options);
    } else {
      // Unix: check if a supported command is installed
      for (const [command, args] of UNIX_WRITE_COMMANDS) {
        const exists = await checkUnixCommandExists({command, processSpawner});
        if (exists) {
          proc = processSpawner.spawn(command, args, options);
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

    proc.stdin?.write(text);
    proc.stdin?.end();
  });
}
