import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

test("HMR updates React without losing state or reloading document", async ({
  page,
}) => {
  test.skip(
    process.env.TEST_HMR !== "1",
    "Requires running Vite; opt in with TEST_HMR=1.",
  );
  const source = new URL("../src/App.tsx", import.meta.url);
  const original = readFileSync(source, "utf8");
  try {
    await page.goto("/app/");
    await page.getByText("Try the workspace").click();
    await page
      .getByLabel("A temporary note (not saved)")
      .fill("HMR retained state");
    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations++;
    });
    writeFileSync(
      source,
      original.replace(
        "Small pages. Big moments.",
        "Small pages. Live moments.",
      ),
    );
    await expect(
      page.getByRole("heading", { name: "Small pages. Live moments." }),
    ).toBeVisible();
    await expect(page.getByLabel("A temporary note (not saved)")).toHaveValue(
      "HMR retained state",
    );
    expect(navigations).toBe(0);
  } finally {
    writeFileSync(source, original);
  }
});
