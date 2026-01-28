import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 120000, // 2 minutes for container operations
    hookTimeout: 60000,  // 1 minute for setup/teardown
    // Run integration tests sequentially to avoid Docker resource conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
