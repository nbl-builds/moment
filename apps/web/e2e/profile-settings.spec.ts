import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { anonRest, signOut } from "./helpers";

// Profile and Account Settings against the portal demo seed (`pnpm exec supabase db reset` first).
const PHOTO = path.join(__dirname, "../../../supabase/seed-media/listings/old-town-walk.jpg");
const BIZ = "00000000-0000-4000-b000-000000000031";

async function login(page: Page, email = "portal@moment.test", password = "password123") {
  await page.goto("/business/login");
  await page.getByLabel("Email Address / Phone Number").fill(email);
  await page.getByLabel("Password*").fill(password);
  await page.getByRole("button", { name: "Continue to my account" }).click();
  await expect(page).toHaveURL(/\/business\/dashboard/);
}

test.describe("profile and account settings", () => {
  test.describe.configure({ mode: "serial" });

  test("profile: edit profile, identity verification, business hours feed the app", async ({ page }, info) => {
    await login(page);
    await page.goto("/business/profile");
    await expect(page.getByRole("heading", { name: "Nadia Qureshi" })).toBeVisible();
    await expect(page.getByText(/Joined in \d{4}/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Confirmation" })).toBeVisible();

    // Edit profile (dialog)
    const bio = `Lahori guide for ten years (${info.project.name}).`;
    await page.getByRole("button", { name: "Edit profile" }).click();
    const sheet = page.getByRole("dialog", { name: "Edit profile" });
    await sheet.getByLabel("Bio").fill(bio);
    await sheet.getByRole("checkbox", { name: /Punjabi/ }).click();
    await sheet.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();
    await expect(page.getByText(bio)).toBeVisible();

    // Identity verification (typed mock)
    await page.getByRole("button", { name: "Verify Now" }).click();
    const idv = page.getByRole("dialog", { name: "Verify your identity" });
    for (const label of ["CNIC front", "CNIC back", "Selfie holding your CNIC"]) {
      await idv.getByLabel(label, { exact: true }).setInputFiles(PHOTO);
    }
    await idv.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("In review", { exact: true })).toBeVisible();

    // Business section: Sunday closed, saved for the app's business page.
    await expect(page.getByRole("heading", { name: "Business", exact: true })).toBeVisible();
    await page.getByRole("checkbox", { name: "Sun" }).uncheck();
    await page.getByRole("button", { name: "Save hours" }).click();
    await expect(page.getByText("Opening hours saved.")).toBeVisible();
    const hours = await anonRest<{ weekday: number }[]>(`business_hours?business_id=eq.${BIZ}&select=weekday`);
    expect(hours.map((h) => h.weekday)).not.toContain(0);
    expect(hours.length).toBe(6);
    await page.getByRole("checkbox", { name: "Sun" }).check();
    await page.getByRole("button", { name: "Save hours" }).click();
    await expect(page.getByText("Opening hours saved.")).toBeVisible();
  });

  test("account settings: personal info, payment method, password and other devices", async ({ page }, info) => {
    await login(page);
    await page.goto("/business/settings");
    await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Payment Method/ })).toBeVisible();

    // Personal Information: masked values, inline edits.
    await page.getByRole("link", { name: /Personal Information/ }).click();
    await expect(page.getByText("p***l@moment.test")).toBeVisible();
    await expect(page.getByText("+92******0031")).toBeVisible();
    await page.getByRole("button", { name: "Edit city" }).click();
    await page.getByLabel("City").selectOption("Islamabad");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("City saved.")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "City" })).toContainText("Islamabad");

    // Payment Method (owner)
    await page.goto("/business/settings/payments");
    await expect(page.getByText("Available to withdraw")).toBeVisible();
    await page.getByRole("button", { name: "Add Payment Method" }).click();
    const add = page.getByRole("dialog", { name: "Add Payment Method" });
    await add.getByRole("radio", { name: /JazzCash/ }).click();
    await add.getByLabel("Account title").fill(`Nadia Qureshi ${info.project.name}`);
    await add.getByLabel("Mobile account number").fill("0300 0000031");
    await add.getByRole("button", { name: "Save account" }).click();
    await expect(page.getByRole("list", { name: "Payout accounts" })).toContainText("JazzCash");
    await page.getByRole("button", { name: "Withdraw Payment" }).click();
    await page.getByRole("dialog", { name: "Withdraw Payment" }).getByLabel("Amount (Rs)").fill("5000");
    await page.getByRole("button", { name: /^Withdraw Rs/ }).click();
    await expect(page.getByText(/Withdrawal TEST-.* requested/)).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    expect((await download).suggestedFilename()).toBe("moment-payouts.csv");

    // Login & Security. Changing the password and ending other sessions would
    // disturb the tests running at the same time, so only the desktop run does it.
    await page.goto("/business/settings/security");
    await expect(page.getByRole("button", { name: "Coming soon" })).toHaveCount(2);
    await expect(page.getByText("Current session")).toBeVisible();
    if (info.project.name !== "desktop") return;
    await page.getByRole("button", { name: "Update Password" }).click();
    await page.getByLabel("Current password").fill("wrong-pass1");
    await page.getByLabel("New password", { exact: true }).fill("password456");
    await page.getByLabel("Confirm new password").fill("password456");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Your current password isn’t right.")).toBeVisible();
    await page.getByLabel("Current password").fill("password123");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Password updated.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save password" })).toHaveCount(0);
    await expect(page.getByText(/Last updated/)).toBeVisible();
    // Put it back for the other tests.
    await page.getByRole("button", { name: "Update Password" }).click();
    await page.getByLabel("Current password").fill("password456");
    await page.getByLabel("New password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm new password").fill("password123");
    await page.getByRole("button", { name: "Save password" }).click();
    // The form closes only when the save succeeded (the first toast may still be showing).
    await expect(page.getByRole("button", { name: "Save password" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Update Password" })).toBeVisible();

    await page.getByRole("button", { name: "Log out of other devices" }).click();
    await expect(page.getByText("Logged out of your other devices.")).toBeVisible();
  });

  test("managers don't see Payment Method; staff have no Business section", async ({ page }) => {
    await login(page, "manager.portal@moment.test");
    await page.goto("/business/settings");
    await expect(page.getByRole("link", { name: /Personal Information/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Payment Method/ })).toHaveCount(0);
    await page.goto("/business/settings/payments");
    await expect(page).toHaveURL(/\/business\/settings$/);
    await page.goto("/business/profile");
    await expect(page.getByText(/Only the owner can change the name/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Save hours" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save details" })).toHaveCount(0);

    await signOut(page);
    await login(page, "staff.portal@moment.test");
    await page.goto("/business/profile");
    await expect(page.getByRole("heading", { name: "Zara Hayat" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Business", exact: true })).toHaveCount(0);
  });
});
