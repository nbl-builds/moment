#!/usr/bin/env node
// Builds apps/web with OpenNext and deploys it to the moment-web-staging Worker.
// Run from the repo root: `pnpm web:deploy:staging`.
//
// - Refuses to run on `main` (main is never deployed).
// - Builds with the public values from wrangler.jsonc only. Local .env files are
//   moved aside during the build, because OpenNext compiles every .env* file it
//   finds into the Worker bundle (that would ship local keys to staging).
// - Fails if the bundle contains a Supabase secret key.
// - Checks the compressed Worker size against the free-plan limit before deploying.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.on("uncaughtException", (error) => {
  console.error(`\n✖ ${error.message}`);
  process.exit(1);
});

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appDir, "../..");
const FREE_PLAN_LIMIT_KIB = 3 * 1024; // compressed (gzip)
const HIDDEN_SUFFIX = ".deploy-hidden";

class DeployError extends Error {}
function fail(message) {
  throw new DeployError(message);
}

function run(cmd, args, env) {
  const result = spawnSync(cmd, args, { cwd: appDir, stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

// 1. Never deploy main.
const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoRoot }).toString().trim();
if (branch === "main") fail("You are on main. main is never deployed: switch to staging or a feature branch.");

// 2. Public build-time values come from wrangler.jsonc.
const wranglerText = fs.readFileSync(path.join(appDir, "wrangler.jsonc"), "utf8");
const wrangler = JSON.parse(wranglerText.replace(/^\s*\/\/.*$/gm, ""));
const vars = wrangler.vars ?? {};
if (vars.NEXT_PUBLIC_APP_ENV !== "staging") fail("wrangler.jsonc vars.NEXT_PUBLIC_APP_ENV must be 'staging'.");

// 3. Hide local env files for the duration of the build + deploy.
const envFiles = [appDir, repoRoot].flatMap((dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => /^\.env(\..+)?$/.test(f) && f !== ".env.example" && !f.endsWith(HIDDEN_SUFFIX))
    .map((f) => path.join(dir, f)),
);
for (const dir of [appDir, repoRoot]) {
  const leftover = fs.readdirSync(dir).find((f) => f.endsWith(HIDDEN_SUFFIX));
  if (leftover) fail(`${path.join(dir, leftover)} exists from an interrupted deploy. Rename it back first.`);
}
const restore = () => {
  for (const file of envFiles) {
    if (fs.existsSync(file + HIDDEN_SUFFIX)) fs.renameSync(file + HIDDEN_SUFFIX, file);
  }
};
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    restore();
    process.exit(130);
  });
}

const env = { ...process.env, ...vars, NEXT_TELEMETRY_DISABLED: "1" };
for (const key of Object.keys(env)) {
  if (/SECRET|SERVICE_ROLE/.test(key)) delete env[key];
}

try {
  for (const file of envFiles) fs.renameSync(file, file + HIDDEN_SUFFIX);

  console.log(`\n▶ Building apps/web for staging (branch ${branch})\n`);
  run("pnpm", ["exec", "opennextjs-cloudflare", "build"], env);

  // 4. Nothing secret in the bundle: no secret key literal, and none of the
  //    secret values from the hidden local env files.
  const openNext = path.join(appDir, ".open-next");
  const secretValues = envFiles.flatMap((file) =>
    fs
      .readFileSync(file + HIDDEN_SUFFIX, "utf8")
      .split("\n")
      .map((line) => line.match(/^\s*[A-Z0-9_]*(SECRET|SERVICE_ROLE)[A-Z0-9_]*\s*=\s*"?([^"\s]+)"?/)?.[2])
      .filter((v) => v && v.length >= 16),
  );
  const patterns = ["sb_secret_[A-Za-z0-9_-]{16,}", ...secretValues.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))];
  const grep = spawnSync("grep", ["-rlE", patterns.join("|"), openNext]);
  const hits = grep.stdout.toString().trim();
  if (hits) fail(`A secret key was found in the bundle:\n${hits}`);
  const nextEnv = fs.readFileSync(path.join(openNext, "cloudflare", "next-env.mjs"), "utf8");
  if (/SUPABASE|KEY/.test(nextEnv)) fail(`Env files were compiled into the bundle:\n${nextEnv}`);

  // 5. Size check (dry run), then deploy.
  const dry = spawnSync("pnpm", ["exec", "wrangler", "deploy", "--dry-run"], { cwd: appDir, env, encoding: "utf8" });
  const out = `${dry.stdout}\n${dry.stderr}`;
  const match = out.match(/Total Upload:\s*([\d.]+)\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/);
  if (!match) fail(`Could not read the Worker size from the dry run:\n${out}`);
  const gzipKiB = Number(match[2]);
  console.log(`\n▶ Worker size: ${match[1]} KiB, ${gzipKiB} KiB gzip (free-plan limit ${FREE_PLAN_LIMIT_KIB} KiB)\n`);
  if (gzipKiB > FREE_PLAN_LIMIT_KIB) fail("The Worker is over the free-plan size limit. Not deploying.");

  run("pnpm", ["exec", "opennextjs-cloudflare", "deploy"], env);
  console.log(`\n✔ Deployed: ${vars.NEXT_PUBLIC_SITE_URL}\n`);
} finally {
  restore();
}
