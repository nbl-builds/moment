import { expect, test, type Page } from "@playwright/test";

// Listing Details against the portal demo seed. Run after `pnpm db:reset`.
const WALK = "00000000-0000-4000-e000-000000000331";
const KITE = "00000000-0000-4000-e000-000000000335";

async function login(page: Page, email = "portal@moment.test") {
  await page.goto("/business/login");
  await page.getByLabel("Email Address / Phone Number").fill(email);
  await page.getByLabel("Password*").fill("password123");
  await page.getByRole("button", { name: "Continue to my account" }).click();
  await expect(page).toHaveURL(/\/business\/dashboard/);
}

test.describe("listing details", () => {
  test("published listing: card opens it, tabs, pause bookings, reservations panel, reply, preview", async ({ page }) => {
    await login(page);
    await page.goto("/business/listings");
    await page.getByRole("heading", { name: "Walled City Food Walk at Dusk" }).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/business/listings/${WALK}$`));
    await expect(page.getByRole("heading", { name: "Listing Details" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Walled City Food Walk at Dusk");
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
    for (const section of ["Description", "Pricing and options", "Itinerary", "What to bring", "Meeting point", "Cancellation policy", "Hosts"]) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }

    // Lightbox
    await page.getByRole("button", { name: /View all photos/ }).click();
    await expect(page.getByRole("dialog", { name: /Photo 1 of/ })).toBeVisible();
    await page.keyboard.press("Escape");

    // Pause and resume new bookings
    const toggle = page.getByRole("switch");
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(page.getByText("New bookings paused. The listing stays published.")).toBeVisible();
    await expect(page.getByText("Paused: guests can see it but not book.")).toBeVisible();
    await page.getByRole("switch").click();
    await expect(page.getByText("Taking bookings again.")).toBeVisible();

    // Availability
    await page.getByRole("link", { name: "Availability", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Upcoming sessions" })).toBeVisible();
    await expect(page.getByText(/\d+ \/ \d+ booked/).first()).toBeVisible();
    await expect(page.getByText("Private event")).toBeVisible();

    // Reservations open the shared side panel
    await page.getByRole("link", { name: "Reservations", exact: true }).click();
    await page.getByRole("link", { name: /^Completed \(\d+\)$/ }).click();
    await page.getByRole("button", { name: /Hamza Khan · 1 guest · Completed/ }).first().click();
    await expect(page.getByRole("dialog", { name: /Reservation MT-/ })).toContainText("Completed");
    await page.keyboard.press("Escape");

    // Reviews tab with reply
    await page.getByRole("link", { name: /^Reviews/ }).click();
    await expect(page.getByText(/\d+ reviews?/).first()).toBeVisible();
    await page.getByRole("button", { name: "Reply", exact: true }).first().click();
    await page.getByLabel(/Reply to/).fill("Shukriya, see you again soon!");
    await page.getByRole("button", { name: "Post reply" }).click();
    await expect(page.getByText("Reply posted. The guest can see it in the app.")).toBeVisible();

    // Preview
    await page.goto(`/business/listings/${WALK}/preview`);
    await expect(page.getByText("Customer preview.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "What you will be doing" })).toBeVisible();
    await expect(page.getByText("Book me")).toBeVisible();
  });

  test("draft: checklist links to wizard steps, publish disabled, duplicate and delete", async ({ page }) => {
    await login(page);
    await page.goto(`/business/listings/${KITE}`);
    await expect(page.getByRole("heading", { name: "Finish your listing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Availability", exact: true }).last()).toHaveAttribute("href", /step=availability/);
    await expect(page.getByRole("link", { name: /At least 3 photos/ })).toHaveAttribute("href", `/business/listings/${KITE}/edit?step=photos`);

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page.getByText("Copy created as a draft.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Basant Kite-Making Class (copy)");
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Delete this draft?");
    await page.getByRole("button", { name: "Delete draft" }).click();
    await expect(page).toHaveURL(/listings\?tab=draft/);
    await expect(page.getByRole("heading", { name: "Basant Kite-Making Class (copy)" })).toHaveCount(0);
  });

  test("archive shows the banner and unarchive brings it back as a draft", async ({ page }) => {
    await login(page);
    await page.goto("/business/listings?tab=archive");
    await page.getByRole("heading", { name: "Lahore Museum After Hours" }).getByRole("link").click();
    await expect(page.getByText("This listing is archived.")).toBeVisible();
    await page.getByRole("status").getByRole("button", { name: "Unarchive" }).click();
    await expect(page.getByText(/Unarchived/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finish your listing" })).toBeVisible();
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await expect(page.getByText("This listing is archived.")).toBeVisible();
  });

  test("staff see it read-only; unknown ids show not found", async ({ page }) => {
    await login(page, "staff.portal@moment.test");
    await page.goto(`/business/listings/${WALK}`);
    await expect(page.getByRole("heading", { name: "Listing Details" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit listing" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "More actions" })).toHaveCount(0);
    await expect(page.getByRole("switch")).toBeDisabled();
    await expect(page.getByRole("link", { name: "Edit description" })).toHaveCount(0);
    await page.goto("/business/listings/00000000-0000-4000-e000-000000000001");
    await expect(page.getByRole("heading", { name: "Listing not found" })).toBeVisible();
  });
});
