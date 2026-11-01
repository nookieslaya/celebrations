import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

test("HMR updates the login view without losing form state", async ({
  page,
}) => {
  test.skip(
    process.env.TEST_HMR !== "1",
    "Requires the existing Vite instance; opt in with TEST_HMR=1.",
  );
  const source = new URL("../src/views/AuthView.tsx", import.meta.url);
  const original = readFileSync(source, "utf8");
  const marker = "registering ? copy.register : copy.login";
  // Source formatting may wrap the expression; whitespace is intentionally ignored.
  const updated = original.replace(
    /registering\s*\?\s*copy\.register\s*:\s*copy\.login/,
    'registering ? copy.register : "Welcome back, live"',
  );
  expect(updated, marker).not.toBe(original);
  try {
    await page.goto("/app/login");
    await page.getByLabel("Email address").fill("hmr@example.invalid");
    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        navigations++;
      }
    });
    writeFileSync(source, updated);
    await expect(
      page.getByRole("heading", { name: "Welcome back, live", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveValue(
      "hmr@example.invalid",
    );
    expect(navigations).toBe(0);
  } finally {
    writeFileSync(source, original);
  }
});
