import {describe, it, expect, vi, afterEach} from 'vitest';
import {spawn} from 'node:child_process';
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
    const text = Math.random().toString();
    await clipboard.writeText(text);
    expect(await clipboard.readText()).toEqual(text);
  });

  describe('errors', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function fakeProcess(
      on: (eventName: 'error' | 'close', cb: (input: any) => void) => void
    ) {
      return {
        stdin: {write: vi.fn(), end: vi.fn()},
        stdout: {on: vi.fn()},
        on
      } as any;
    }

    describe('writeText()', () => {
      it('throws an error if no tool can be found', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('aix');

        await expect(clipboard.writeText('foo')).rejects.toThrowError(
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

        await expect(clipboard.writeText('foo')).rejects.toThrowError(
          'An error occurred while copying'
        );
      });

      it('throws an error if it does not close properly', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
        vi.mocked(spawn).mockImplementationOnce(() =>
          fakeProcess((eventName, cb) => {
            if (eventName === 'close') cb(1);
          })
        );

        await expect(clipboard.writeText('foo')).rejects.toThrowError(
          'An unknown error occurred while copying'
        );
      });
    });

    describe('readText()', () => {
      it('throws an error if no tool can be found', async () => {
        vi.spyOn(process, 'platform', 'get').mockReturnValue('aix');

        await expect(clipboard.readText()).rejects.toThrowError(
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

        await expect(clipboard.readText()).rejects.toThrowError(
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

        await expect(clipboard.readText()).rejects.toThrowError(
          'An unknown error occurred while reading from clipboard'
        );
      });
    });
  });
});
