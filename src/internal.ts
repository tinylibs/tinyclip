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

interface CommandProvider {
  get: () => Promise<Command | undefined>;
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

export class NodeReadCommandProvider implements CommandProvider {
  #processSpawner: ProcessSpawner;

  constructor(processSpawner: ProcessSpawner) {
    this.#processSpawner = processSpawner;
  }

  async get(): Promise<Command | undefined> {
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
          return [
            'powershell.exe',
            ['-noprofile', '-command', 'Get-Clipboard']
          ];
        }
        if (
          await checkUnixCommandExists({
            command: 'xsel',
            processSpawner: this.#processSpawner
          })
        ) {
          return ['xsel', ['--clipboard', '--output']];
        }
        return ['xclip', ['-selection', 'clipboard', '-o']];
      case 'android':
        return ['termux-clipboard-get', []];
      default:
        return undefined;
    }
  }
}

export class NodeWriteCommandProvider implements CommandProvider {
  #processSpawner: ProcessSpawner;

  constructor(processSpawner: ProcessSpawner) {
    this.#processSpawner = processSpawner;
  }

  async get(): Promise<Command | undefined> {
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
        if (
          await checkUnixCommandExists({
            command: 'xsel',
            processSpawner: this.#processSpawner
          })
        ) {
          return ['xsel', ['--clipboard', '--input']];
        }
        return ['xclip', ['-selection', 'clipboard', '-i']];
      case 'android':
        return ['termux-clipboard-set', []];
      default:
        return undefined;
    }
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

export function readTextInternal({
  processSpawner,
  commandProvider
}: {
  processSpawner: ProcessSpawner;
  commandProvider: CommandProvider;
}): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const command = await commandProvider.get();
    if (!command) {
      return reject(new Error('No clipboard tool found'));
    }

    const proc = processSpawner.spawn(...command, {
      signal: AbortSignal.timeout(TIMEOUT)
    });

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

export function writeTextInternal({
  text,
  processSpawner,
  commandProvider
}: {
  text: string;
  processSpawner: ProcessSpawner;
  commandProvider: CommandProvider;
}): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const command = await commandProvider.get();
    if (!command) {
      return reject(new Error('No clipboard tool found'));
    }

    const proc = processSpawner.spawn(...command, {
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

    proc.stdin?.write(text);
    proc.stdin?.end();
  });
}
