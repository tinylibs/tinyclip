import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/*.test.ts'],
    environment: 'node',
    name: 'node',
    coverage: {
      provider: 'v8'
    }
  }
});
