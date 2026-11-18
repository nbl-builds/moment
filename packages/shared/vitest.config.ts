import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Formatting must not depend on the machine's timezone.
    env: { TZ: 'America/New_York' },
  },
});
