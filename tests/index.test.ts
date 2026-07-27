import {describe, it, expect, vi, afterEach} from 'vitest';
import {type ChildProcess, spawn} from 'node:child_process';
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
      } as unknown as ChildProcess;
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
        const {spawn: realSpawn} =
          await vi.importActual<typeof import('node:child_process')>(
            'node:child_process'
          );
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce((_command, _args, options) =>
          realSpawn(process.execPath, ['-e', 'process.exit(1)'], options)
        );

        const uncaught = vi.fn();
        process.on('uncaughtException', uncaught);

        try {
          // Enough data that the write cannot complete before the tool exits.
          await expect(
            clipboard.writeText('x'.repeat(1024 * 1024))
          ).rejects.toThrow();
          await new Promise((resolve) => setTimeout(resolve, 100));
          expect(uncaught).not.toHaveBeenCalled();
        } finally {
          process.off('uncaughtException', uncaught);
        }
      });

      it('rejects if writing to stdin fails but exit is 0', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce(() => {
          const proc = fakeProcess((eventName, cb) => {
            if (eventName === 'exit') {
              cb(0);
            }
          });
          vi.mocked(proc.stdin!.on).mockImplementation(
            (eventName: string | symbol, cb: (error: Error) => void) => {
              if (eventName === 'error') {
                cb(new Error('write EPIPE'));
              }
              return proc.stdin!;
            }
          );
          return proc;
        });

        try {
          await clipboard.writeText('foo');
          expect.fail('Expected writeText to reject');
        } catch (error) {
          expect((error as Error).message).toEqual(
            'An error occurred while copying'
          );
          expect(((error as Error).cause as Error).message).toEqual(
            'write EPIPE'
          );
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
