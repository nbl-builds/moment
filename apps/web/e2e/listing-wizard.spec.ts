import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { anonRest } from "./helpers";

// Create New Listing wizard against the portal demo seed (`pnpm exec supabase db reset` first).
// Local .env.local has AUTO_APPROVE_BUSINESSES=1, so a submitted listing of the
// (active) demo business is published at once.
const PHOTOS = ["old-town-walk", "night-market", "food-tasting", "museum-gallery", "family-cooking"].map((p) =>
  path.join(__dirname, "../../../supabase/seed-media/listings", `${p}.jpg`),
);
// Each project resumes its own seeded draft (they run side by side).
const SETTINGS_DRAFT = "00000000-0000-4000-e000-000000000341"; // resumes at Group size
const PAGE_DRAFT = "00000000-0000-4000-e000-000000000340"; // resumes at Photos

async function login(page: Page) {
  await page.goto("/business/login");
  await page.getByLabel("Email Address / Phone Number").fill("portal@moment.test");
  await page.getByLabel("Password*").fill("password123");
  await page.getByRole("button", { name: "Continue to my account" }).click();
  await expect(page).toHaveURL(/\/business\/dashboard/);
}

const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true });
async function goNext(page: Page, heading: string | RegExp) {
  await expect(next(page)).toBeEnabled();
  await next(page).click();
  await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
}

/** Jump to a step: sidebar on desktop, the step dropdown on phones. */
async function jump(page: Page, group: string, label: string, value: string, mobile: boolean) {
  if (mobile) return page.getByLabel("Step", { exact: true }).selectOption(value);
  const header = page.getByRole("navigation", { name: "Listing steps" }).getByRole("button", { name: group, exact: true });
  if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
  await page.getByRole("navigation", { name: "Listing steps" }).getByRole("button", { name: new RegExp(`^${label}`) }).click();
}

async function uploadPhotos(page: Page) {
  await page.getByTestId("photo-input").setInputFiles(PHOTOS);
  await expect(page.getByRole("heading", { name: "How does it look?" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Photo \d+$/ })).toHaveCount(5, { timeout: 30_000 });
}

test.describe("listing wizard", () => {
  test.describe.configure({ mode: "serial" });

  test("experience: every step, autosave, submit, then it's in the app with price, discount and sessions", async ({ page }, info) => {
    test.setTimeout(180_000);
    const title = `Margalla Sunrise Hike ${info.project.name}`;
    await login(page);
    await page.goto("/business/listings/new");
    await expect(page.getByRole("heading", { name: "Create New Listing" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact Us" })).toBeVisible();

    // Your Idea
    await page.getByRole("radio", { name: /^Experience/ }).click();
    await next(page).click();
    await expect(page).toHaveURL(/\/edit\?step=basics/);
    await expect(page.getByRole("heading", { name: "Tell us a bit more" })).toBeVisible();
    await expect(next(page)).toBeEnabled();
    await page.getByLabel("Which city do you want to host your experience in?").selectOption("Islamabad");
    await page.getByRole("button", { name: /Which language/ }).click();
    await page.getByRole("checkbox", { name: "Urdu" }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByRole("button", { name: /Which language/ })).toContainText("English, Urdu");
    await goNext(page, "What is your main focus area?");
    await expect(next(page)).toBeDisabled();
    await page.getByRole("radio", { name: /^Tours/ }).click();
    await page.getByRole("radio", { name: "Tours & Walks" }).click();
    await goNext(page, "Let’s give your experience a name");

    // Experience page
    await expect(next(page)).toBeDisabled();
    await page.getByLabel("Title").fill(title);
    await expect(page.getByText(`${title.length}/60`)).toBeVisible();
    await goNext(page, "Add your photos");
    await expect(next(page)).toBeDisabled();
    await uploadPhotos(page);
    await page.getByRole("button", { name: "Set as cover" }).first().click();
    await goNext(page, "Let’s describe your experience");
    await page.getByLabel("Description").fill(
      "Start in the dark at Trail 3, climb through pine forest to Pir Sohawa as the sun comes up over Islamabad, then warm up with paratha and chai at the top.",
    );
    await page.getByLabel("How long is your experience?").selectOption("240");
    await goNext(page, "Where should guests meet you?");
    await expect(page.getByLabel("Province")).toHaveValue("Islamabad Capital Territory");
    await page.getByLabel("Street Address").fill("Trail 3 car park, Margalla Road, F-6");
    await page.getByRole("button", { name: "Pin Islamabad centre" }).click();
    await goNext(page, "Add details about what you will provide");
    await page.getByRole("button", { name: "+ Food" }).click();
    await page.getByLabel("Item").fill("Head torch");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("list", { name: "Included" }).getByRole("listitem")).toHaveCount(2);
    await goNext(page, "Who can attend your experience?");
    await page.getByLabel("Minimum Age").selectOption("12");
    await page.getByRole("radio", { name: "Moderate" }).click();
    await page.getByRole("radio", { name: "Intermediate" }).click();

    // Settings
    await goNext(page, "Maximum group size");
    await page.getByLabel("Public Group").selectOption("8");
    await page.getByLabel("Private group").selectOption("4");
    await goNext(page, "When can guests book?");
    await page.getByRole("button", { name: "Sat", exact: true }).click();
    await page.getByRole("button", { name: "Sun", exact: true }).click();
    await page.getByLabel("Start time").fill("06:00");
    await page.getByRole("button", { name: "Add time" }).click();
    await goNext(page, "Booking settings");
    await page.getByRole("radio", { name: /Request to book/ }).click();
    await page.getByLabel("Booking cut-off").selectOption("1440");
    await page.getByRole("radio", { name: /^Strict/ }).click();
    await goNext(page, "Guest pricing");
    await page.getByLabel(/^Price/).fill("3500");
    await expect(page.getByText("You’ll earn")).toContainText("Rs 3,150");
    await page.getByLabel(/Private group price/).fill("20000");
    await goNext(page, "Discount");
    await page.getByRole("switch", { name: "Large group discount" }).click();
    await page.getByLabel("Guests or more").fill("4");
    await page.getByLabel("Discount %").first().fill("10");
    await page.getByRole("switch", { name: "Early-bird discount" }).click();

    // Your submission
    await goNext(page, "Your information");
    await expect(page.getByLabel("Display name")).toHaveValue("Nadia Qureshi");
    await goNext(page, "Review & submit");
    await expect(page.getByRole("list", { name: "Summary" })).toContainText(title);
    await expect(page.getByRole("list", { name: "Summary" })).toContainText("10% for 4+ guests");
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByRole("heading", { name: "Your listing is live" })).toBeVisible();
    await page.getByRole("link", { name: "Go to Listing Details" }).click();
    await expect(page.getByRole("heading", { name: "Listing Details" })).toBeVisible();
    const id = /listings\/([0-9a-f-]{36})/.exec(page.url())![1]!;

    // What the mobile app sees (signed out).
    const [listing] = await anonRest<{ id: string; title: string; price_amount: number; status: string; instant_book: boolean }[]>(
      `listings?id=eq.${id}&select=id,title,price_amount,status,instant_book`,
    );
    expect(listing).toMatchObject({ title, price_amount: 350000, status: "published", instant_book: false });
    const search = await anonRest<{ id: string }[]>(`listings?select=id&status=eq.published&title=ilike.*${encodeURIComponent("Margalla Sunrise")}*`);
    expect(search.map((r) => r.id)).toContain(id);
    const slots = await anonRest<{ id: string; capacity: number; starts_at: string }[]>(`slots?listing_id=eq.${id}&select=id,capacity,starts_at&order=starts_at`);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]!.capacity).toBe(8);
    const quote = await anonRest<{ subtotal: number; offer_discount: number; offer_label: string }>("rpc/quote_booking", {
      method: "POST",
      body: JSON.stringify({ p_listing_id: id, p_guest_count: 4 }),
    });
    expect(quote).toMatchObject({ subtotal: 1400000, offer_discount: 140000, offer_label: "Group discount (10%)" });
  });

  test("service: staff and hours instead of group size, then submit", async ({ page }, info) => {
    test.setTimeout(180_000);
    await login(page);
    await page.goto("/business/listings/new");
    await page.getByRole("radio", { name: /^Service/ }).click();
    await next(page).click();
    await expect(page).toHaveURL(/\/edit\?step=basics/);
    await page.getByLabel("Which city do you want to host your service in?").selectOption("Lahore");
    await goNext(page, "What is your main focus area?");
    await page.getByRole("radio", { name: /^Beauty/ }).click();
    await page.getByRole("radio", { name: "Hair" }).click();
    await goNext(page, "Let’s give your service a name");
    await page.getByLabel("Title").fill(`Keratin Hair Treatment ${info.project.name}`);
    await goNext(page, "Add your photos");
    await uploadPhotos(page);
    await goNext(page, "Let’s describe your service");
    await page.getByLabel("Description").fill(
      "A smoothing keratin treatment for frizz-free hair that lasts up to three months, with a wash, blow-dry and aftercare advice from our senior stylist.",
    );
    await page.getByLabel("How long is your service?").selectOption("150");
    await goNext(page, "Where should guests meet you?");
    await page.getByLabel("Street Address").fill("14-B MM Alam Road, Gulberg III");
    await page.getByRole("button", { name: "Pin Lahore centre" }).click();
    await goNext(page, "Add details about what you will provide");
    await page.getByRole("button", { name: "+ Drinks" }).click();

    // No Guest requirements / Group size for services; Staff instead.
    await goNext(page, "Who performs this service?");
    await expect(page.getByRole("button", { name: "Guest requirements" })).toHaveCount(0);
    await page.getByLabel("Name", { exact: true }).fill(`Sana Mirza ${info.project.name}`);
    await page.getByLabel("Role").fill("Senior stylist");
    await page.getByRole("button", { name: "Add staff member" }).click();
    await expect(page.getByRole("checkbox", { name: new RegExp(`Sana Mirza ${info.project.name}`) })).toHaveAttribute("aria-checked", "true");
    await goNext(page, "When can guests book?");
    await expect(next(page)).toBeDisabled();
    await page.getByRole("checkbox", { name: "Tue" }).check();
    await page.getByRole("checkbox", { name: "Wed" }).check();
    await page.getByLabel("Gap between appointments").selectOption("15");
    await goNext(page, "Booking settings");
    await goNext(page, "Guest pricing");
    await page.getByLabel(/^Price/).fill("12000");
    await page.getByRole("button", { name: "+ Add an option" }).click();
    await page.getByLabel("Option 1 name").fill("Long hair");
    await page.getByLabel("Option 1 price").fill("15000");
    await goNext(page, "Discount");
    await goNext(page, "Your information");
    await goNext(page, "Review & submit");
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByRole("heading", { name: "Your listing is live" })).toBeVisible();
  });

  test("resume a draft where it stopped, unsaved changes ask first, Save & exit goes to drafts", async ({ page }, info) => {
    const mobile = info.project.name === "mobile";
    const draft = mobile ? PAGE_DRAFT : SETTINGS_DRAFT;
    await login(page);
    await page.goto(`/business/listings/${draft}/edit`);
    await expect(page.getByRole("heading", { level: 2, name: mobile ? "Add your photos" : "Maximum group size" })).toBeVisible();

    // An incomplete step can't be saved: leaving asks first.
    await jump(page, "Experience page", "Title", "title", mobile);
    await expect(page.getByRole("heading", { level: 2, name: /give your experience a name/ })).toBeVisible();
    await page.getByLabel("Title").fill("Ravi");
    await jump(page, "Experience page", "Photos", "photos", mobile);
    await expect(page.getByRole("alertdialog")).toContainText("Leave without saving?");
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(page.getByRole("heading", { level: 2, name: mobile ? "Add your photos" : "How does it look?" })).toBeVisible();

    // A complete change autosaves on the way out.
    await page.goto(`/business/listings/${draft}/edit?step=group`);
    await page.getByLabel("Public Group").selectOption("12");
    await page.getByRole("button", { name: "Save & exit" }).click();
    await expect(page).toHaveURL(/\/business\/listings\?tab=draft/);
    await page.goto(`/business/listings/${draft}/edit?step=group`);
    await expect(page.getByLabel("Public Group")).toHaveValue("12");
  });
});
