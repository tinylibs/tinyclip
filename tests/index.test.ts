import {describe, it, expect, vi, afterEach} from 'vitest';
import {spawn} from 'node:child_process';
import {rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as clipboard from '../src/index.js';

vi.mock('node:child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:child_process')>();
  return {...mod, spawn: vi.fn(mod.spawn)};
});

describe('clipboard', () => {
  it('should export correct API', () => {
    expect(clipboard).toHaveProperty('readText');
    expect(clipboard).toHaveProperty('writeText');
  });

  it('should copy then read successfully', async () => {
    const text = '❤️' + Math.random().toString();
    await clipboard.writeText(text);
    expect(await clipboard.readText()).toEqual(text);
  });

  it('should write an empty string without throwing', async () => {
    await expect(clipboard.writeText('')).resolves.toBeUndefined();
    expect(await clipboard.readText()).toEqual('');
  });

  describe('errors', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function fakeProcess(
      on: (
        eventName: 'error' | 'close' | 'exit',
        cb: (input: any) => void
      ) => void,
      stderrData?: string
    ) {
      return {
        stdin: {write: vi.fn(), end: vi.fn(), on: vi.fn()},
        stdout: {on: vi.fn()},
        stderr: {
          on: vi.fn((eventName: string, cb: (chunk: unknown) => void) => {
            if (eventName === 'data' && stderrData !== undefined)
              cb(stderrData);
          }),
          destroy: () => {}
        },
        on
      } as any;
    }

    describe('writeText()', () => {
      it('throws an error if no tool can be found', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('aix');

        await expect(clipboard.writeText('foo')).rejects.toThrow(
          'No clipboard tool found'
        );
      });

      it('throws an error if copying goes wrong', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce(() =>
          fakeProcess((eventName, cb) => {
            if (eventName === 'error') cb(new Error('test'));
          })
        );

        await expect(clipboard.writeText('foo')).rejects.toThrow(
          'An error occurred while copying'
        );
      });

      it('throws an error if it does not close properly', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce(() =>
          fakeProcess((eventName, cb) => {
            if (eventName === 'exit') cb(1);
          })
        );

        await expect(clipboard.writeText('foo')).rejects.toThrow(
          'command `pbcopy` exited with code 1'
        );
      });

      it('surfaces the command, exit code and stderr as the cause', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce(() =>
          fakeProcess((eventName, cb) => {
            if (eventName === 'exit') cb(2);
          }, 'pbcopy: boom')
        );

        const error = await clipboard.writeText('foo').catch((e) => e);
        expect(error.message).toContain('`pbcopy`');
        expect(error.message).toContain('exited with code 2');
        expect(error.message).toContain('stderr: pbcopy: boom');
      });

      it('rejects instead of throwing when the tool exits before reading stdin', async () => {
        const {spawn: actualSpawn} =
          await vi.importActual<typeof import('node:child_process')>(
            'node:child_process'
          );
        const tool = join(tmpdir(), `tinyclip-exit-${process.pid}.sh`);
        await writeFile(tool, '#!/bin/sh\nexit 1\n', {mode: 0o755});

        const uncaught = vi.fn();
        process.on('uncaughtException', uncaught);
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce((_command, _args, options) =>
          actualSpawn(tool, [], options as any)
        );

        try {
          await expect(
            clipboard.writeText('x'.repeat(1024 * 1024))
          ).rejects.toThrow();
          await new Promise((resolve) => setTimeout(resolve, 100));
          expect(uncaught).not.toHaveBeenCalled();
        } finally {
          process.off('uncaughtException', uncaught);
          await rm(tool, {force: true});
        }
      });
    });

    describe('readText()', () => {
      it('throws an error if no tool can be found', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('aix');

        await expect(clipboard.readText()).rejects.toThrow(
          'No clipboard tool found'
        );
      });

      it('throws an error if copying goes wrong', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce(() =>
          fakeProcess((eventName, cb) => {
            if (eventName === 'error') cb(new Error('test'));
          })
        );

        await expect(clipboard.readText()).rejects.toThrow(
          'An error occurred while reading from clipboard'
        );
      });

      it('throws an error if it does not close properly', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce(() =>
          fakeProcess((eventName, cb) => {
            if (eventName === 'close') cb(1);
          })
        );

        await expect(clipboard.readText()).rejects.toThrow(
          'command `pbpaste` exited with code 1'
        );
      });

      it('surfaces the command, exit code and stderr as the cause', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce(() =>
          fakeProcess((eventName, cb) => {
            if (eventName === 'close') cb(2);
          }, 'pbpaste: boom')
        );

        const error = await clipboard.readText().catch((e) => e);
        expect(error.message).toContain('`pbpaste`');
        expect(error.message).toContain('exited with code 2');
        expect(error.message).toContain('stderr: pbpaste: boom');
      });
    });
  });
});
