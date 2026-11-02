import { chooseTemplate } from "./editor-navigation.mjs";
import assert from "node:assert/strict";
import {
  chromium,
  expect,
} from "../app/node_modules/@playwright/test/index.mjs";

export async function runBrowserFlows({ origin, password, check, isolatedWp }) {
  const browser = await chromium.launch();
  const contextA = await browser.newContext({ baseURL: origin });
  const contextB = await browser.newContext({
    baseURL: origin,
    viewport: { width: 390, height: 844 },
  });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const errors = [];
  pageA.on("pageerror", (error) => errors.push(error.message));
  pageB.on("pageerror", (error) => errors.push(error.message));
  const emailA = "browser-a@example.invalid";
  const emailB = "browser-b@example.invalid";
  let projectPath;

  async function register(page, email) {
    await page.goto("/app/register");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app\/sites$/);
  }

  async function login(page, email) {
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }

  try {
    await check(
      "browser production: registration, catalog selection and one project creation",
      async () => {
        const viteRequests = [];
        pageA.on("request", (request) => {
          if (
            request.url().includes("5173") ||
            request.url().includes("@vite")
          ) {
            viteRequests.push(request.url());
          }
        });
        await register(pageA, emailA);
        await expect(
          pageA.getByText("Your next idea starts here"),
        ).toBeVisible();
        await pageA
          .getByRole("link", { name: "Create a site", exact: true })
          .first()
          .click();
        await expect(pageA).toHaveURL(/\/app\/sites\/new$/);
        await chooseTemplate(pageA, "basic-page", "Simple Page");
        await pageA.getByLabel("Project name").fill("First browser project");
        await pageA
          .getByRole("button", { name: "Create project", exact: true })
          .click();
        await expect(pageA).toHaveURL(/\/app\/sites\/[1-9][0-9]*$/);
        projectPath = new URL(pageA.url()).pathname;
        await expect(pageA.getByLabel("Heading", { exact: true })).toHaveValue(
          "A new beginning",
        );
        assert.deepEqual(viteRequests, []);
      },
    );

    await check(
      "browser production: all editor fields, live preview, save and refresh persistence",
      async () => {
        await pageA.getByLabel("Project name").fill("Saved browser project");
        await pageA
          .getByLabel("Heading", { exact: true })
          .fill("A lovely new page");
        await pageA
          .getByLabel("Description", { exact: true })
          .fill("A description saved through the real API.");
        await pageA.getByLabel("Accent color").selectOption("ocean");
        await expect(
          pageA
            .getByRole("region", { name: "Live draft preview" })
            .getByRole("heading", { name: "A lovely new page" }),
        ).toBeVisible();
        await expect(
          pageA.getByRole("region", { name: "Live draft preview" }),
        ).toHaveAttribute("data-accent", "ocean");
        await pageA
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          pageA.getByText("Changes saved.", { exact: true }),
        ).toBeVisible();
        await pageA.reload();
        await expect(pageA.getByLabel("Project name")).toHaveValue(
          "Saved browser project",
        );
        await expect(pageA.getByLabel("Heading", { exact: true })).toHaveValue(
          "A lovely new page",
        );
        await expect(
          pageA.getByLabel("Description", { exact: true }),
        ).toHaveValue("A description saved through the real API.");
        await expect(pageA.getByLabel("Accent color")).toHaveValue("ocean");
        const consumedBootstrap = JSON.parse(
          await pageA.locator("#microsite-config").textContent(),
        );
        assert.equal(consumedBootstrap.session.user, null);
        assert.equal(consumedBootstrap.session.nonce, null);
        await pageA.screenshot({
          path: "/tmp/microsite-stage3-desktop.png",
          fullPage: true,
        });
      },
    );

    await check(
      "browser: a real backend validation failure preserves the unsaved form",
      async () => {
        await pageA
          .getByLabel("Heading", { exact: true })
          .fill("<b>Not allowed</b>");
        await pageA
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(pageA.getByRole("alert")).toBeVisible();
        await expect(pageA.getByLabel("Heading", { exact: true })).toHaveValue(
          "<b>Not allowed</b>",
        );
        await expect(
          pageA.getByText("You have unsaved changes.", { exact: true }),
        ).toBeVisible();
        await expect(
          pageA.getByText("Changes saved.", { exact: true }),
        ).toHaveCount(0);
        assert.equal(
          await pageA
            .getByRole("region", { name: "Live draft preview" })
            .locator("b")
            .count(),
          0,
        );
        await pageA
          .getByLabel("Heading", { exact: true })
          .fill("A lovely new page");
      },
    );

    await check(
      "browser: a network failure keeps typed data and does not retry the save",
      async () => {
        let attempts = 0;
        const failure = async (route) => {
          if (route.request().method() === "PATCH") {
            attempts++;
            await route.abort("failed");
          } else {
            await route.continue();
          }
        };
        await pageA.route("**/wp-json/microsites/v1/sites/*", failure);
        try {
          await pageA
            .getByLabel("Project name")
            .fill("Retained after a network failure");
          await pageA
            .getByRole("button", { name: "Save draft", exact: true })
            .click();
          await expect(pageA.getByRole("alert")).toContainText(
            "Connection failed",
          );
          await expect(pageA.getByLabel("Project name")).toHaveValue(
            "Retained after a network failure",
          );
          assert.equal(attempts, 1);
        } finally {
          await pageA.unroute("**/wp-json/microsites/v1/sites/*", failure);
        }
        await pageA.getByLabel("Project name").fill("Saved browser project");
      },
    );

    await check(
      "browser: a pending save disables fields and cannot overwrite newer edits",
      async () => {
        let release;
        const gate = new Promise((resolve) => {
          release = resolve;
        });
        const delay = async (route) => {
          if (route.request().method() === "PATCH") {
            await gate;
          }
          await route.continue();
        };
        await pageA.route("**/wp-json/microsites/v1/sites/*", delay);
        try {
          await pageA
            .getByLabel("Description", { exact: true })
            .fill("Saved after a deliberately delayed request.");
          await pageA
            .getByRole("button", { name: "Save draft", exact: true })
            .click();
          await expect(
            pageA.getByLabel("Heading", { exact: true }),
          ).toBeDisabled();
          await expect(pageA.getByLabel("Project name")).toBeDisabled();
          await expect(
            pageA.getByRole("button", { name: "Saving…", exact: true }),
          ).toBeDisabled();
          release();
          await expect(
            pageA.getByText("Changes saved.", { exact: true }),
          ).toBeVisible();
          await expect(
            pageA.getByLabel("Description", { exact: true }),
          ).toHaveValue("Saved after a deliberately delayed request.");
        } finally {
          release();
          await pageA.unroute("**/wp-json/microsites/v1/sites/*", delay);
        }
      },
    );

    await check(
      "browser: navigation and reload warn about unsaved changes and cancellation retains them",
      async () => {
        await pageA.getByLabel("Project name").fill("Unsaved browser name");
        let navigationWarning = false;
        pageA.once("dialog", async (dialog) => {
          navigationWarning = dialog.type() === "confirm";
          await dialog.dismiss();
        });
        await pageA.getByRole("link", { name: /Back to projects/ }).click();
        await expect(pageA.getByLabel("Project name")).toHaveValue(
          "Unsaved browser name",
        );
        assert.equal(navigationWarning, true);
        let reloadWarning = false;
        pageA.once("dialog", async (dialog) => {
          reloadWarning = dialog.type() === "beforeunload";
          await dialog.dismiss();
        });
        await pageA.reload({ timeout: 5000 }).catch(() => undefined);
        assert.equal(reloadWarning, true);
        await expect(pageA.getByLabel("Project name")).toHaveValue(
          "Unsaved browser name",
        );
        pageA.once("dialog", (dialog) => dialog.accept());
        await pageA.getByRole("link", { name: /Back to projects/ }).click();
        await expect(
          pageA.getByRole("heading", {
            name: "Saved browser project",
            exact: true,
          }),
        ).toBeVisible();
        await pageA
          .getByRole("link", { name: "Edit project", exact: true })
          .click();
        await expect(pageA.getByLabel("Project name")).toHaveValue(
          "Saved browser project",
        );
      },
    );

    await check(
      "browser: logout protects direct routes, login returns safely to the saved project",
      async () => {
        await pageA
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await expect(pageA).toHaveURL(/\/app\/login$/);
        await pageA.goto(projectPath);
        await expect(pageA).toHaveURL(/\/app\/login\?next=/);
        await expect(pageA.getByLabel("Project name")).toHaveCount(0);
        await login(pageA, emailA);
        await expect(pageA).toHaveURL(new RegExp(`${projectPath}$`));
        await expect(pageA.getByLabel("Project name")).toHaveValue(
          "Saved browser project",
        );
      },
    );

    await check(
      "browser: customer B cannot list or open A's project; mobile layout fits",
      async () => {
        await register(pageB, emailB);
        await expect(
          pageB.getByRole("heading", {
            name: "Saved browser project",
            exact: true,
          }),
        ).toHaveCount(0);
        await pageB.goto(projectPath);
        await expect(pageB.getByRole("alert")).toContainText("unavailable");
        await expect(pageB.getByLabel("Project name")).toHaveCount(0);
        assert.equal(
          await pageB.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      },
    );

    await check(
      "browser: session expiry clears private data and a different account never sees the previous project",
      async () => {
        const userId = Number(
          isolatedWp(["user", "get", emailA, "--field=ID"]),
        );
        isolatedWp([
          "eval",
          `WP_Session_Tokens::get_instance(${userId})->destroy_all();`,
        ]);
        await pageA
          .getByRole("link", { name: "My sites", exact: true })
          .click();
        await expect(pageA).toHaveURL(/\/app\/login/);
        await expect(
          pageA.getByText(
            "Your session expired or changed. Sign in again to continue.",
          ),
        ).toBeVisible();
        await login(pageA, emailB);
        await expect(pageA).toHaveURL(/\/app\/sites$/);
        await expect(
          pageA.getByRole("heading", {
            name: "Saved browser project",
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(pageA.getByText(emailB, { exact: true })).toBeVisible();
      },
    );

    await check(
      "browser: real paginated API results drive next and previous controls",
      async () => {
        const shell = await contextB.request.get("/app/sites");
        const html = await shell.text();
        const bootstrap = JSON.parse(
          /<script id="microsite-config" type="application\/json">([^<]+)<\/script>/.exec(
            html,
          )[1],
        );
        for (let index = 0; index < 11; index++) {
          const created = await contextB.request.post(
            "/wp-json/microsites/v1/sites",
            {
              headers: { "X-WP-Nonce": bootstrap.session.nonce },
              data: {
                name: `Pagination ${index}`,
                siteType: "basic-page",
                templateId: "basic",
              },
            },
          );
          assert.equal(created.status(), 201);
        }
        await pageB.goto("/app/sites");
        await expect(pageB.locator(".site-card")).toHaveCount(10);
        await pageB.getByRole("link", { name: "Next", exact: true }).click();
        await expect(pageB.locator(".site-card")).toHaveCount(1);
        await pageB
          .getByRole("link", { name: "Previous", exact: true })
          .click();
        await expect(pageB.locator(".site-card")).toHaveCount(10);
        assert.equal(
          await pageB.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await pageB.screenshot({
          path: "/tmp/microsite-stage3-mobile.png",
          fullPage: true,
        });
      },
    );

    await check(
      "browser: foreign return URLs cannot redirect login outside the application",
      async () => {
        await pageA
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await pageA.goto("/app/login?next=https%3A%2F%2Fevil.example%2F");
        await login(pageA, emailB);
        await expect(pageA).toHaveURL(`${origin}/app/sites`);
      },
    );

    await check(
      "browser: another tab clears its private view after logout",
      async () => {
        const otherTab = await contextA.newPage();
        try {
          await otherTab.goto("/app/sites");
          await expect(otherTab.locator(".site-card")).toHaveCount(10);
          await pageA
            .getByRole("button", { name: "Sign out", exact: true })
            .click();
          await expect(otherTab).toHaveURL(/\/app\/login/);
          await expect(otherTab.locator(".site-card")).toHaveCount(0);
          await expect(
            otherTab.getByText(
              "Your session changed in another tab. Reload this page or sign in again.",
            ),
          ).toBeVisible();
        } finally {
          await otherTab.close();
        }
      },
    );

    await check(
      "browser: a permission denial remains distinct from an expired session",
      async () => {
        const restricted = await browser.newContext({ baseURL: origin });
        try {
          const page = await restricted.newPage();
          await page.goto("/app/login");
          await login(page, "subscriber@example.invalid");
          await expect(page).toHaveURL(/\/app\/sites$/);
          await expect(page.getByRole("alert")).toContainText("permission");
          await expect(
            page.getByRole("button", { name: "Sign out", exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText(
              "Your session expired or changed. Sign in again to continue.",
            ),
          ).toHaveCount(0);
        } finally {
          await restricted.close();
        }
      },
    );

    await check(
      "browser: disabled registration has an explicit state instead of an unusable form",
      async () => {
        isolatedWp(["option", "update", "users_can_register", "0"]);
        const disabled = await browser.newContext({ baseURL: origin });
        try {
          const page = await disabled.newPage();
          await page.goto("/app/register");
          await expect(
            page.getByText(
              "Registration is currently closed. Please contact the site administrator.",
            ),
          ).toBeVisible();
          await expect(page.getByLabel("Email address")).toHaveCount(0);
        } finally {
          await disabled.close();
          isolatedWp(["option", "update", "users_can_register", "1"]);
        }
      },
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
