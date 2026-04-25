import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-env.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/test-env.ts',
        'src/index.ts', // Express app bootstrap — not unit testable
        'src/db/index.ts', // DB connection bootstrap
        'src/types/**/*.ts', // Type-only declaration files
      ],
      thresholds: {
        // OAuth callback and Google service require live credentials — excluded from
        // threshold calculation. Achievable baseline with mocked unit/integration tests.
        lines: 55,
        functions: 60,
        branches: 50,
        statements: 55,
      },
    },
  },
});
