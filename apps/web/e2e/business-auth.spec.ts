import { expect, test } from "@playwright/test";
import { deleteLocalBusinesses, deleteLocalUser, expectDashboard, fillDetails, latestEmail, NEW_PHONE, signOut, typeCode } from "./helpers";

// Set E2E_AUTO_APPROVE=0 when the server runs without AUTO_APPROVE_BUSINESSES=1.
const autoApprove = process.env.E2E_AUTO_APPROVE !== "0";
const PASSWORD = "moment123";

test.describe("business sign up with phone @staging", () => {
  test.beforeEach(async ({ baseURL }) => {
    if (baseURL?.includes("localhost")) await deleteLocalUser({ phone: NEW_PHONE.e164 });
  });

  test("welcome -> phone -> wrong code -> code -> host -> category -> details -> dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/business$/);
    await expect(page.getByRole("heading", { name: "A new journey starts here" })).toBeVisible();
    await page.getByRole("link", { name: "Get Started" }).click();

    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
    const continueButton = page.getByRole("button", { name: "Continue", exact: true });
    await expect(continueButton).toBeDisabled();
    await page.getByLabel("Phone Number").fill("12345");
    await page.getByLabel("Phone Number").blur();
    await expect(page.getByText("Enter a valid mobile number, e.g. 0300 1234567")).toBeVisible();
    await page.getByLabel("Phone Number").fill(`0${NEW_PHONE.national}`);
    await expect(page.getByLabel("Phone Number")).toHaveValue("308 4282001");
    await continueButton.click();

    await expect(page).toHaveURL(/\/business\/verify$/);
    await expect(page.getByText(`Sent to ${NEW_PHONE.e164}`)).toBeVisible();
    await expect(page.getByRole("button", { name: /Send again in 0:\d\d/ })).toBeDisabled();

    await typeCode(page, "000000");
    await expect(page.getByLabel("Digit 1 of 6")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert").filter({ hasText: /not right|expired/ })).toBeVisible();

    // Paste the right code into the first box.
    await page.getByLabel("Digit 1 of 6").click();
    await page.evaluate((code) => {
      const data = new DataTransfer();
      data.setData("text", code);
      document.activeElement?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
    }, NEW_PHONE.code);

    await expect(page).toHaveURL(/\/business\/onboarding\/type$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Tell us about yourself" })).toBeVisible();
    await page.getByRole("link", { name: /Host & Experiences/ }).click();

    await expect(page.getByRole("heading", { name: "What does your business provide? Select one." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Beauty/ })).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(7);
    await page.getByRole("link", { name: /^Tours/ }).click();

    await expect(page.getByLabel("Host Name*")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    await fillDetails(page, { name: "Ali Hunza Treks", password: PASSWORD });
    await page.getByRole("button", { name: "Agree & Continue" }).click();

    await expectDashboard(page);
    if (autoApprove) await expect(page.getByText("Your business is under review.")).toHaveCount(0);
    else await expect(page.getByText("Your business is under review.")).toBeVisible();

    // Signed in with a business: auth pages go to the dashboard.
    await page.goto("/business/signup");
    await expect(page).toHaveURL(/\/business\/dashboard$/);
    await signOut(page);

    // Phone + password login.
    await page.getByLabel("Email Address / Phone Number").fill(`0${NEW_PHONE.national}`);
    await page.getByLabel("Password*").fill(PASSWORD);
    await page.getByRole("button", { name: "Continue to my account" }).click();
    await expectDashboard(page);
  });
});

test.describe("business sign up with email", () => {
  test("email -> code -> business -> category -> details (email locked) -> dashboard, then login", async ({ page }, info) => {
    const email = `owner.${info.project.name}.${Date.now()}@moment.test`;
    await page.goto("/business/signup");
    await page.getByRole("button", { name: "Continue with email" }).click();
    await expect(page).toHaveURL(/method=email/);
    await expect(page.getByRole("button", { name: "Continue with phone" })).toBeVisible();

    const sentAfter = Date.now();
    await page.getByLabel("Email Address").fill(email);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText(`Sent to ${email}`)).toBeVisible();

    const mail = await latestEmail(email, sentAfter);
    const code = /\b(\d{6})\b/.exec(mail.Text)?.[1];
    expect(code).toBeTruthy();
    await typeCode(page, code!);

    await expect(page).toHaveURL(/\/business\/onboarding\/type$/, { timeout: 15_000 });
    await page.getByRole("link", { name: /^Business/ }).click();
    await page.getByRole("link", { name: /^Beauty/ }).click();

    await expect(page.getByLabel("Business Name*")).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
    await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
    await fillDetails(page, { name: "Gulberg Glow Salon", password: PASSWORD });
    await page.getByRole("button", { name: "Agree & Continue" }).click();

    await expectDashboard(page);
    await signOut(page);

    // Wrong password, then the right one.
    await page.getByLabel("Email Address / Phone Number").fill(email);
    await page.getByLabel("Password*").fill("wrongpass1");
    await page.getByRole("button", { name: "Continue to my account" }).click();
    await expect(page.getByText("That email or phone number and password don't match.")).toBeVisible();
    await page.getByLabel("Password*").fill(PASSWORD);
    await page.getByRole("button", { name: "Continue to my account" }).click();
    await expectDashboard(page);
  });
});

test.describe("forgot and reset password", () => {
  test("email: reset link -> Set new password -> login with toast", async ({ page }, info) => {
    const email = `reset.${info.project.name}.${Date.now()}@moment.test`;
    await page.goto("/business/signup?method=email");
    const sentAfter = Date.now();
    await page.getByLabel("Email Address").fill(email);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const code = /\b(\d{6})\b/.exec((await latestEmail(email, sentAfter)).Text)?.[1];
    await typeCode(page, code!);
    await expect(page).toHaveURL(/onboarding\/type$/, { timeout: 15_000 });
    await page.getByRole("link", { name: /Host & Experiences/ }).click();
    await page.getByRole("link", { name: /^Food/ }).click();
    await fillDetails(page, { name: "Lahore Food Walks", password: PASSWORD });
    await page.getByRole("button", { name: "Agree & Continue" }).click();
    await expectDashboard(page);
    await signOut(page);

    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
    const resetAfter = Date.now();
    await page.getByLabel("Email Address / Phone Number").fill(email);
    await page.getByRole("button", { name: "Send link" }).click();
    await expect(page.getByText(`If an account uses ${email}`)).toBeVisible();

    const mail = await latestEmail(email, resetAfter);
    const link = /href="([^"]+)"/.exec(mail.HTML)?.[1]?.replace(/&amp;/g, "&");
    expect(link).toBeTruthy();
    await page.goto(link!);
    await expect(page).toHaveURL(/\/business\/reset-password$/);
    await expect(page.getByRole("heading", { name: "Set new password" })).toBeVisible();
    await page.getByLabel("New Password*", { exact: true }).fill("newpass456");
    await page.getByLabel("Confirm New Password*").fill("newpass457");
    await page.getByLabel("Confirm New Password*").blur();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
    await page.getByLabel("Confirm New Password*").fill("newpass456");
    await page.getByRole("button", { name: "Save password" }).click();

    await expect(page).toHaveURL(/\/business\/login\?toast=password-updated$/);
    await expect(page.getByText("Password updated. Log in with your new password.")).toBeVisible();
    await page.getByLabel("Email Address / Phone Number").fill(email);
    await page.getByLabel("Password*").fill("newpass456");
    await page.getByRole("button", { name: "Continue to my account" }).click();
    await expectDashboard(page);
  });

  test("phone: code -> Set new password -> login", async ({ page }) => {
    // Needs the phone account from the phone sign-up test (same project run).
    await page.goto("/business/forgot-password");
    await page.getByLabel("Email Address / Phone Number").fill(`+92 ${NEW_PHONE.national}`);
    await page.getByRole("button", { name: "Send link" }).click();
    await expect(page).toHaveURL(/\/business\/verify$/);
    await typeCode(page, NEW_PHONE.code);
    await expect(page).toHaveURL(/\/business\/reset-password$/, { timeout: 15_000 });
    await page.getByLabel("New Password*", { exact: true }).fill("phonepass789");
    await page.getByLabel("Confirm New Password*").fill("phonepass789");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Password updated. Log in with your new password.")).toBeVisible();
    await page.getByLabel("Email Address / Phone Number").fill(`0${NEW_PHONE.national}`);
    await page.getByLabel("Password*").fill("phonepass789");
    await page.getByRole("button", { name: "Continue to my account" }).click();
    await expectDashboard(page);
  });
});

test.describe("routing and extras", () => {
  test("signed-out guard, social coming soon, existing consumer creates a business", async ({ page }, info) => {
    // Seeded consumers without a business; one per project so both runs start clean.
    const consumer = info.project.name === "mobile" ? "fatima@moment.test" : "hamza@moment.test";
    await deleteLocalBusinesses({ email: consumer });
    await page.goto("/business/dashboard");
    await expect(page).toHaveURL(/\/business\/login$/);
    await page.goto("/business/onboarding/details");
    await expect(page).toHaveURL(/\/business\/login$/);

    await page.getByRole("button", { name: "Continue with google" }).click();
    await expect(page.getByText("Google sign-in is coming soon")).toBeVisible();

    // Seeded consumer (no business) signs in with email + password -> onboarding.
    await page.getByLabel("Email Address / Phone Number").fill(consumer);
    await page.getByLabel("Password*").fill("password123");
    await page.getByRole("button", { name: "Continue to my account" }).click();
    await expect(page).toHaveURL(/\/business\/onboarding\/type$/);
    await page.goto("/business/dashboard");
    await expect(page).toHaveURL(/\/business\/onboarding\/type$/);
    await page.getByRole("link", { name: /^Business/ }).click();
    await page.getByRole("link", { name: /^Adventure/ }).click();
    // Signed in with a password: no password fields.
    await expect(page.getByLabel("Password*", { exact: true })).toHaveCount(0);
    await fillDetails(page, { name: `Hamza Adventures ${Date.now() % 10000}` });
    await page.getByRole("button", { name: "Agree & Continue" }).click();
    await expectDashboard(page);
  });
});
