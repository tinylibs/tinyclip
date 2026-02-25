export interface SpawnProcess {
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

export interface ProcessSpawnerOptions {
  signal?: AbortSignal;
  stdio?: ['pipe', 'ignore', 'ignore'];
}

export interface ProcessSpawner {
  spawn: (
    commmand: string,
    args: Array<string>,
    options: ProcessSpawnerOptions
  ) => SpawnProcess;
}

export type Command = [string, Array<string>];

export interface CommandProvider {
  get: () => Promise<Command | undefined>;
}
