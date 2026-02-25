import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8'
    },
    projects: [
      {
        extends: './vitest.config.ts',
        test: {
          include: ['tests/index.test.ts'],
          environment: 'node',
          name: 'node'
        }
      },
      {
        extends: './vitest.config.ts',
        test: {
          include: ['tests/browser.test.ts'],
          name: 'browser',
          browser: {
            enabled: true,
            provider: playwright({
              contextOptions: {
                permissions: ['clipboard-read', 'clipboard-write']
              }
            }),
            headless: true,
            instances: [{browser: 'chromium'}],
            screenshotFailures: false
          }
        }
      }
    ]
  }
});
