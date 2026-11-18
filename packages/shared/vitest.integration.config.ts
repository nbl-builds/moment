import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

// Reads the local Supabase URL and publishable key from the CLI unless they are set.
function localSupabaseEnv(): Record<string, string> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) return {};
  try {
    const out = execSync('supabase status -o env', { cwd: '../..', encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const vars = Object.fromEntries(
      out
        .split('\n')
        .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim()))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => [m[1], m[2]]),
    );
    return { SUPABASE_URL: vars.API_URL ?? '', SUPABASE_PUBLISHABLE_KEY: vars.PUBLISHABLE_KEY ?? vars.ANON_KEY ?? '' };
  } catch {
    return {};
  }
}

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    env: localSupabaseEnv(),
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
