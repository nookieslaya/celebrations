import { test, expect } from "@playwright/test";

for (const path of [
  "/app/",
  "/app/sites",
  "/app/sites/new",
  "/app/sites/123",
]) {
  test(`anonymous direct entry and refresh: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page).toHaveURL(/\/app\/login/);
    await expect(
      page.getByRole("heading", { name: "Welcome back", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Welcome back", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("registration route reflects the WordPress bootstrap setting", async ({
  page,
}) => {
  await page.goto("/app/register");
  await expect(
    page.getByRole("heading", { name: "Create your account", exact: true }),
  ).toBeVisible();
  const enabled = await page
    .locator("#microsite-config")
    .textContent()
    .then((text) => JSON.parse(text!).session.registrationEnabled);
  if (enabled) {
    await expect(page.getByLabel("Confirm password")).toBeVisible();
  } else {
    await expect(
      page.getByText(
        "Registration is currently closed. Please contact the site administrator.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveCount(0);
  }
});
