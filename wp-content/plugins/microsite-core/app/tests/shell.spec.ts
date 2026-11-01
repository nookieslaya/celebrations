import { test, expect } from "@playwright/test";
for (const path of ["/app/", "/app/sites"]) {
  test(`direct entry and refresh: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Your next idea starts here" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your next idea starts here" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("client navigation retains temporary state", async ({ page }) => {
  await page.goto("/app/");
  await page.getByText("Try the workspace").click();
  await page.getByLabel("A temporary note (not saved)").fill("Birthday idea");
  await page.getByRole("link", { name: "My sites" }).click();
  await expect(page).toHaveURL(/\/app\/sites$/);
  await expect(page.getByLabel("A temporary note (not saved)")).toHaveValue(
    "Birthday idea",
  );
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Small pages. Big moments." }),
  ).toBeVisible();
});
