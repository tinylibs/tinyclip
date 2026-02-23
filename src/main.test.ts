import {describe, it, expect} from 'vitest';
import * as clipboard from './main.js';

describe('clipboard', () => {
  it('should export correct API', () => {
    expect(clipboard).toHaveProperty('readText');
    expect(clipboard).toHaveProperty('writeText');
    expect(clipboard).toHaveProperty('readTextSync');
    expect(clipboard).toHaveProperty('writeTextSync');
  });
});
