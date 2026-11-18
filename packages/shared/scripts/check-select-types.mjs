// supabase-js reports a bad select string ("column 'x' does not exist") as a
// type, not a compile error. Emit declarations and fail if any of those types
// leaked into the API surface.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'moment-shared-dts-'));
try {
  execFileSync('tsc', ['--noEmit', 'false', '--declaration', '--emitDeclarationOnly', '--outDir', out], { stdio: 'inherit' });
  const problems = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.d.ts')) {
        for (const match of readFileSync(path, 'utf8').matchAll(/error: true;\s*\}\s*&\s*"([^"]+)"/g)) {
          problems.push(`${path.slice(out.length + 1)}: ${match[1]}`);
        }
      }
    }
  };
  walk(out);
  if (problems.length) {
    console.error(`Invalid Supabase select strings:\n${[...new Set(problems)].map((p) => `  ${p}`).join('\n')}`);
    process.exit(1);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
