import { expect, test, type Page } from "@playwright/test";

// Business portal against local Supabase with the portal demo seed
// (supabase/seeds/portal_demo.sql). Run after `pnpm db:reset`.
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE = process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

async function login(page: Page, email = "portal@moment.test") {
  await page.goto("/business/login");
  await page.getByLabel("Email Address / Phone Number").fill(email);
  await page.getByLabel("Password*").fill("password123");
  await page.getByRole("button", { name: "Continue to my account" }).click();
  await expect(page).toHaveURL(/\/business\/dashboard/);
}

/** What the guest's app sees: their own booking, read with their session. */
async function guestBooking(email: string, code: string) {
  const token = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  }).then((r) => r.json() as Promise<{ access_token: string }>);
  const rows = await fetch(`${SUPABASE_URL}/rest/v1/bookings?code=eq.${code}&select=status`, {
    headers: { apikey: PUBLISHABLE, Authorization: `Bearer ${token.access_token}` },
  }).then((r) => r.json() as Promise<{ status: string }[]>);
  const notifications = await fetch(`${SUPABASE_URL}/rest/v1/notifications?select=title,data&order=created_at.desc&limit=1`, {
    headers: { apikey: PUBLISHABLE, Authorization: `Bearer ${token.access_token}` },
  }).then((r) => r.json() as Promise<{ title: string }[]>);
  return { status: rows[0]?.status, notification: notifications[0]?.title };
}

const GUEST_EMAIL: Record<string, string> = {
  "Hamza Khan": "hamza@moment.test",
  "Fatima Noor": "fatima@moment.test",
  "Bilal Hussain": "bilal@moment.test",
  "Zainab Rizvi": "zainab@moment.test",
  "Usman Ali": "usman@moment.test",
  "Sana Iqbal": "sana@moment.test",
};

test.describe("portal", () => {
  test("dashboard: tabs with counts, accept a pending reservation, the guest sees it", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: /Good (Morning|Afternoon|Evening)!/ })).toBeVisible();
    await expect(page.getByText("Your reservations")).toBeVisible();
    const pendingTab = page.getByRole("link", { name: /^Pending \(\d+\)$/ });
    const before = Number((await pendingTab.textContent())?.match(/\d+/)?.[0]);
    expect(before).toBeGreaterThan(0);
    await pendingTab.click();
    await expect(page).toHaveURL(/tab=pending/);

    await page.getByRole("button", { name: /Badshahi Mosque/ }).first().click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByText("Pending", { exact: true }).first()).toBeVisible();
    const code = (await panel.getByRole("heading").first().textContent())!.replace("Reservation ", "").trim();
    const guestName = (await panel.locator("p").filter({ hasText: /Khan|Noor|Hussain|Rizvi|Ali|Iqbal/ }).first().textContent())!.trim();
    await panel.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Reservation accepted. The guest has been told.")).toBeVisible();
    await expect(panel.getByText("Confirmed", { exact: true }).first()).toBeVisible();
    await expect(panel.getByRole("button", { name: "Cancel" })).toBeVisible();

    // The mobile app reads the same row (and gets a notification).
    const seen = await guestBooking(GUEST_EMAIL[guestName]!, code);
    expect(seen.status).toBe("confirmed");
    expect(seen.notification).toMatch(/confirm/i);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: `Pending (${before - 1})` })).toBeVisible();
  });

  test("decline needs a reason", async ({ page }) => {
    await login(page);
    await page.goto("/business/dashboard?tab=pending");
    await page.getByRole("button", { name: /Badshahi Mosque/ }).first().click();
    const panel = page.getByRole("dialog");
    await panel.getByRole("button", { name: "Decline" }).click();
    await expect(panel.getByRole("button", { name: "Decline request" })).toBeDisabled();
    await panel.getByLabel(/Why are you declining/).fill("Fully booked that morning, sorry!");
    await panel.getByRole("button", { name: "Decline request" }).click();
    await expect(page.getByText("Request declined. The guest has been told.")).toBeVisible();
    await expect(panel.getByText("Cancelled by you", { exact: true }).first()).toBeVisible();
    await expect(panel.getByText("“Fully booked that morning, sorry!”")).toBeVisible();
  });

  test("inbox: unread thread, send a message, message guest from a reservation", async ({ page }) => {
    await login(page);
    await page.goto("/business/inbox");
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await page.getByRole("button", { name: "Unread", exact: true }).click();
    const unreadRow = page.getByRole("button", { name: /unread/ }).first();
    await expect(unreadRow).toBeVisible();
    await unreadRow.click();
    await expect(page).toHaveURL(/inbox\?c=/);
    const text = `Thanks, see you there! ${Date.now()}`;
    await page.getByLabel("Write a message").fill(text);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator("p", { hasText: text })).toBeVisible();
    await page.getByRole("button", { name: "What should I bring" }).click();
    await expect(page.getByLabel("Write a message")).toHaveValue("What should I bring");

    await page.goto("/business/dashboard?tab=upcoming");
    await page.getByRole("button", { name: /Walled City|Badshahi|Truck Art|Rickshaw/ }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Message guest" }).click();
    await expect(page).toHaveURL(/inbox\?c=/);
    await expect(page.getByRole("button", { name: "View reservation" })).toBeVisible();
  });

  test("reviews: reply to a review", async ({ page }) => {
    await login(page);
    await page.goto("/business/reviews");
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
    await page.getByRole("button", { name: "Reply", exact: true }).first().click();
    const reply = `Thank you for coming, hope to see you again! ${Date.now()}`;
    await page.getByLabel(/Reply to/).fill(reply);
    await page.getByRole("button", { name: "Post reply" }).click();
    await expect(page.getByText("Reply posted. The guest can see it in the app.")).toBeVisible();
    await expect(page.getByText(reply)).toBeVisible();
  });

  test("calendar, listings, insights", async ({ page }) => {
    await login(page);
    await page.goto("/business/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("grid").first()).toBeVisible();
    await page.getByRole("button", { name: /Walled City|Badshahi|Rickshaw|Truck/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/business/listings");
    await expect(page.getByRole("heading", { name: "My Listings" })).toBeVisible();
    await page.getByRole("link", { name: /Draft \(02\)/ }).click();
    await expect(page.getByRole("heading", { name: "My Drafts" })).toBeVisible();
    await page.getByRole("button", { name: "All" }).click();
    await page.getByRole("menuitemradio", { name: "Art & Culture" }).click();
    await expect(page.getByRole("heading", { name: "Basant Kite-Making Class" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shalimar Gardens Picnic" })).toHaveCount(0);

    await page.goto("/business/insights");
    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
    await expect(page.getByText("Wallet Amount")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Revenue" })).toBeVisible();
    await page.getByLabel("Incoming bookings period").selectOption("yearly");
    await page.getByRole("button", { name: "Withdraw" }).click();
    await page.getByRole("button", { name: /^Withdraw Rs/ }).click();
    await expect(page.getByText(/Request TEST-/)).toBeVisible();
  });

  test("roles: staff see no money and cannot edit listings", async ({ page }) => {
    await login(page, "staff.portal@moment.test");
    await expect(page.getByRole("link", { name: "Create new listing" })).toHaveCount(0);
    await page.goto("/business/insights");
    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
    await expect(page.getByText("Wallet Amount")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Revenue" })).toHaveCount(0);
    await page.goto("/business/listings");
    await expect(page.getByRole("link", { name: /^Edit / })).toHaveCount(0);
    await page.goto("/business/reviews");
    await expect(page.getByRole("button", { name: "Reply", exact: true })).toHaveCount(0);
  });

  test("avatar menu, help sheet and logout", async ({ page }) => {
    await login(page);
    const menuButton = page.getByRole("button", { name: /Account menu/ });
    const isPhone = (page.viewportSize()?.width ?? 1440) < 1024;
    if (isPhone) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await expect(page.getByRole("link", { name: "Calendar" })).toBeVisible();
      await page.getByRole("button", { name: "Menu", exact: true }).click();
    }
    await menuButton.click();
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Get Help" }).click();
    await expect(page.getByRole("dialog", { name: "Get help" })).toBeVisible();
    await page.keyboard.press("Escape");
    await menuButton.click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/business\/login/);
  });
});
