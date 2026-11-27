import { defineConfig, devices } from "@playwright/test";

// Business portal end-to-end tests. Local by default (pnpm dev + supabase start,
// codes from Mailpit). E2E_BASE_URL=<staging url> runs the @staging tests only.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isLocal = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  grep: isLocal ? undefined : /@staging/,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1024 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
});
