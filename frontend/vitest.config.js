import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      threshold: {
        lines: 80,
        functions: 80
      }
    },
    include: ['src/test/**/*.test.{js,jsx}'],
    exclude: ['src/test/e2e/**', 'src/test/integration/**']
  }
});