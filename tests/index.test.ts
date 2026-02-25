import {describe, it, expect} from 'vitest';
import * as clipboard from '../src/index.js';
import {readTextInternal, writeTextInternal} from '../src/node.js';

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
    describe('writeTextInternal()', () => {
      it('throws an error if no tool can be found', async () => {
        await expect(
          writeTextInternal({
            text: 'foo',
            commandProvider: {
              get: async () => undefined
            },
            processSpawner: {
              spawn: () => {
                return {
                  stdin: null,
                  stdout: null,
                  on: (eventName, cb) => {
                    if (eventName === 'close') {
                      // @ts-expect-error weird types
                      cb(1);
                    }
                  }
                };
              }
            }
          })
        ).rejects.toThrowError('No clipboard tool found');
      });

      it('throws an error if copying goes wrong', async () => {
        await expect(
          writeTextInternal({
            text: 'foo',
            commandProvider: {
              get: async () => ['foo', []]
            },
            processSpawner: {
              spawn: () => {
                return {
                  stdin: null,
                  stdout: null,
                  on: (eventName, cb) => {
                    if (eventName === 'error') {
                      // @ts-expect-error weird types
                      cb(new Error('test'));
                    }
                  }
                };
              }
            }
          })
        ).rejects.toThrowError('An error occurred while copying');
      });

      it('throws an error if it does not close properly', async () => {
        await expect(
          writeTextInternal({
            text: 'foo',
            commandProvider: {
              get: async () => ['foo', []]
            },
            processSpawner: {
              spawn: () => {
                return {
                  stdin: null,
                  stdout: null,
                  on: (eventName, cb) => {
                    if (eventName === 'close') {
                      // @ts-expect-error weird types
                      cb(1);
                    }
                  }
                };
              }
            }
          })
        ).rejects.toThrowError('An unknown error occurred while copying');
      });
    });
  });

  describe('readTextInternal()', () => {
    it('throws an error if no tool can be found', async () => {
      await expect(
        readTextInternal({
          commandProvider: {
            get: async () => undefined
          },
          processSpawner: {
            spawn: () => {
              return {
                stdin: null,
                stdout: null,
                on: (eventName, cb) => {
                  if (eventName === 'close') {
                    // @ts-expect-error weird types
                    cb(1);
                  }
                }
              };
            }
          }
        })
      ).rejects.toThrowError('No clipboard tool found');
    });

    it('throws an error if copying goes wrong', async () => {
      await expect(
        readTextInternal({
          commandProvider: {
            get: async () => ['foo', []]
          },
          processSpawner: {
            spawn: () => {
              return {
                stdin: null,
                stdout: null,
                on: (eventName, cb) => {
                  if (eventName === 'error') {
                    // @ts-expect-error weird types
                    cb(new Error('test'));
                  }
                }
              };
            }
          }
        })
      ).rejects.toThrowError('An error occurred while reading from clipboard');
    });

    it('throws an error if it does not close properly', async () => {
      await expect(
        readTextInternal({
          commandProvider: {
            get: async () => ['foo', []]
          },
          processSpawner: {
            spawn: () => {
              return {
                stdin: null,
                stdout: null,
                on: (eventName, cb) => {
                  if (eventName === 'close') {
                    // @ts-expect-error weird types
                    cb(1);
                  }
                }
              };
            }
          }
        })
      ).rejects.toThrowError(
        'An unknown error occurred while reading from clipboard'
      );
    });
  });
});
