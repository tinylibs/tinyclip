import {describe, expect, it, beforeEach} from 'vitest';
import {userEvent} from 'vitest/browser';
import * as clipboard from '../src/browser.js';

describe('clipboard', () => {
  beforeEach(async () => {
    // Simulate user interaction to satisfy clipboard API security requirements
    await userEvent.click(document.body);
  });

  it('should export correct API', () => {
    expect(clipboard).toHaveProperty('readText');
    expect(clipboard).toHaveProperty('writeText');
  });

  it('should copy then read successfully', async () => {
    const text = Math.random().toString();
    await clipboard.writeText(text);
    expect(await clipboard.readText()).toEqual(text);
  });
});
