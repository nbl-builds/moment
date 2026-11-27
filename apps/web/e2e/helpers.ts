import { expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";

// Local Supabase only (`supabase status`). Never point these at a hosted project.
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";

let secretKey: string | undefined = process.env.E2E_SUPABASE_SECRET_KEY;
/** The local service key, read from `supabase status` (never committed). */
function localSecretKey(): string {
  if (!secretKey) {
    const out = execSync("pnpm exec supabase status -o env", { cwd: `${__dirname}/../../..`, encoding: "utf8" });
    secretKey = /^SECRET_KEY="?([^"\n]+)"?$/m.exec(out)?.[1];
    if (!secretKey) throw new Error("Could not read SECRET_KEY from `supabase status`. Is local Supabase running?");
  }
  return secretKey;
}

/** Supabase test phone numbers (supabase/config.toml [auth.sms.test_otp]). */
export const NEW_PHONE = { national: "3084282001", e164: "+923084282001", code: "051518" };

const admin = (path: string, init?: RequestInit) => {
  const key = localSecretKey();
  return fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers },
  });
};

async function findLocalUser(match: { phone?: string; email?: string }) {
  for (let page = 1; page <= 10; page++) {
    const res = await admin(`/users?page=${page}&per_page=200`);
    const { users } = (await res.json()) as { users: { id: string; phone?: string; email?: string }[] };
    const user = users.find(
      (u) => (match.phone && `+${u.phone}` === match.phone) || (match.email && u.email === match.email.toLowerCase()),
    );
    if (user) return user;
    if (users.length < 200) return undefined;
  }
  return undefined;
}

/** Deletes the businesses a local user created (a business must keep an owner, so this goes first). */
export async function deleteLocalBusinesses(match: { phone?: string; email?: string }) {
  const user = await findLocalUser(match);
  if (!user) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/businesses?created_by=eq.${user.id}`, {
    method: "DELETE",
    headers: { apikey: localSecretKey(), Authorization: `Bearer ${localSecretKey()}` },
  });
  if (!res.ok) throw new Error(`Could not delete businesses: ${res.status} ${await res.text()}`);
}

/** Deletes the local auth user with this phone (E.164) or email, if any, so a sign-up test starts fresh. */
export async function deleteLocalUser(match: { phone?: string; email?: string }) {
  await deleteLocalBusinesses(match);
  const user = await findLocalUser(match);
  if (user) await admin(`/users/${user.id}`, { method: "DELETE" });
}

/** Latest Mailpit message to `email`, polled until it arrives. */
export async function latestEmail(email: string, after: number) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const fresh = messages.find((m) => new Date(m.Created).getTime() >= after - 2000);
    if (fresh) {
      const message = await (await fetch(`${MAILPIT_URL}/api/v1/message/${fresh.ID}`)).json();
      return message as { Text: string; HTML: string };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email for ${email}`);
}

export async function typeCode(page: Page, code: string) {
  await page.getByLabel("Digit 1 of 6").click();
  await page.keyboard.type(code);
}

export async function fillDetails(page: Page, values: { name: string; password?: string; email?: string }) {
  await page.getByLabel(/^(Host|Business) Name\*/).fill(values.name);
  await page.getByLabel("Address*").fill("House 12, Street 4, F-7/2");
  await page.getByLabel("Country*").selectOption("PK");
  await page.getByLabel("City*").selectOption("Islamabad");
  if (values.email) await page.getByLabel("Email", { exact: true }).fill(values.email);
  if (values.password) {
    await page.getByLabel("Password*", { exact: true }).fill(values.password);
    await page.getByLabel("Confirm Password*").fill(values.password);
  }
}

/** Signed in to the portal dashboard as the owner whose first name is given. */
export async function expectDashboard(page: Page, ownerFirstName?: string) {
  await expect(page).toHaveURL(/\/business\/dashboard/);
  await expect(page.getByText("Your reservations")).toBeVisible();
  if (ownerFirstName) await expect(page.getByText(`Hi, ${ownerFirstName}`)).toBeVisible();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/business\/login/);
}

let publishableKey: string | undefined = process.env.E2E_SUPABASE_PUBLISHABLE_KEY;
/** What the mobile app sees: a signed-out (anon) PostgREST call against local Supabase. */
export async function anonRest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  if (!publishableKey) {
    const out = execSync("pnpm exec supabase status -o env", { cwd: `${__dirname}/../../..`, encoding: "utf8" });
    publishableKey = /^PUBLISHABLE_KEY="?([^"\n]+)"?$/m.exec(out)?.[1];
    if (!publishableKey) throw new Error("Could not read PUBLISHABLE_KEY from `supabase status`.");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}
