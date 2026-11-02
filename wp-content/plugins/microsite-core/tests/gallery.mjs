import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  chromium,
  expect,
} from "../app/node_modules/@playwright/test/index.mjs";

export async function runGalleryTests({
  origin,
  api,
  b,
  check,
  password,
  pluginDirectory,
  isolatedWp,
}) {
  const artifacts = join(pluginDirectory, "app/test-results/gallery");
  const thumbnails = join(pluginDirectory, "assets/template-previews");
  mkdirSync(artifacts, { recursive: true });
  mkdirSync(thumbnails, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const guestContext = await browser.newContext({
    baseURL: origin,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) =>
    requests.push({ url: request.url(), method: request.method() }),
  );
  let id;
  let editorPath;
  async function step(name) {
    await page
      .getByRole("button", { name: new RegExp(`^Step [0-9]+: ${name}`) })
      .click();
  }
  async function shot(name) {
    await expect(page.locator(".loading")).toHaveCount(0);
    if (name.startsWith("gallery-")) {
      await expect(
        page.getByRole("heading", {
          name: "Choose your template",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .locator(".template-card > img")
        .evaluateAll((images) =>
          Promise.all(images.map((image) => image.decode())),
        );
    }
    await page.screenshot({ path: join(artifacts, name), fullPage: true });
  }
  try {
    await check(
      "gallery: real account, catalog metadata, anonymous demo protection and read-only demo",
      async () => {
        isolatedWp(["option", "update", "users_can_register", "1"]);
        await page.goto("/app/register");
        await page
          .getByLabel("Email address")
          .fill("gallery-user@example.invalid");
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByLabel("Confirm password").fill(password);
        await page
          .getByRole("button", { name: "Create account", exact: true })
          .click();
        await expect(page).toHaveURL(/\/app\/sites$/);
        await page.goto("/app/sites/new");
        const catalog = (await api(null, "GET", "/catalog")).data;
        assert.equal(catalog.templates.length, 3);
        assert.equal(
          requests.some((request) =>
            /BirthdayCelebration-|BirthdayParty-/.test(request.url),
          ),
          false,
        );
        for (const template of catalog.templates) {
          assert.ok(
            template.name && template.description && template.thumbnailUrl,
          );
          assert.ok(!JSON.stringify(template).includes(pluginDirectory));
        }
        await expect(page.locator(".template-card")).toHaveCount(2);
        const createsBefore = requests.filter(
          (request) =>
            request.method === "POST" && /\/sites(?:\?|$)/.test(request.url),
        ).length;
        const anonymous = await guestContext.newPage();
        await anonymous.goto("/app/sites/new?demo=birthday-celebration");
        await expect(anonymous).toHaveURL(/\/app\/login\?next=/);
        await anonymous.close();
        for (const template of catalog.templates) {
          const type = template.siteTypes[0];
          const palette = Object.values(template.allowedAppearance)[0][0];
          await page.goto(
            `/app/sites/new?type=${type}&demo=${template.id}&palette=${palette}`,
          );
          await expect(
            page.getByText(`Demo · ${template.name}`, { exact: true }),
          ).toBeVisible();
          await expect(page.locator(".template-demo-stage")).toBeVisible();
          await expect(
            page.locator(
              ".template-demo-stage .celebration, .template-demo-stage .party, .template-demo-stage .draft-preview",
            ),
          ).toBeVisible();
          await expect(
            page.locator(".invitation-assets-gate[data-ready=false]"),
          ).toHaveCount(0);
          assert.equal(
            await page
              .getByRole("button", { name: "Send RSVP", exact: true })
              .count(),
            0,
          );
          for (const color of Object.values(template.allowedAppearance)[0]) {
            await page.goto(
              `/app/sites/new?type=${type}&demo=${template.id}&palette=${color}`,
            );
            const root = page.locator(
              ".template-demo-stage .celebration, .template-demo-stage .party, .template-demo-stage .draft-preview",
            );
            await expect(root).toBeVisible();
            await expect(
              page.locator(".invitation-assets-gate[data-ready=false]"),
            ).toHaveCount(0);
            await page.setViewportSize({ width: 390, height: 640 });
            const style = await page.addStyleTag({
              content:
                ".template-demo-toolbar, .demo-notice { display: none !important; }",
            });
            await page.evaluate(() => document.fonts.ready);
            const thumbnailPath = join(
              thumbnails,
              `${template.id}-${color}.png`,
            );
            await page.screenshot({
              path:
                process.env.UPDATE_TEMPLATE_THUMBNAILS === "1"
                  ? thumbnailPath
                  : join(artifacts, `renderer-${template.id}-${color}.png`),
            });
            assert.equal(existsSync(thumbnailPath), true);
            await style.evaluate((element) => element.remove());
          }
          await page.setViewportSize({ width: 1440, height: 900 });
        }
        const createsAfter = requests.filter(
          (request) =>
            request.method === "POST" && /\/sites(?:\?|$)/.test(request.url),
        ).length;
        assert.equal(createsAfter, createsBefore);
        await page.goto("/app/sites/new");
        await shot("gallery-desktop.png");
        await page.setViewportSize({ width: 390, height: 844 });
        await shot("gallery-mobile.png");
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.setViewportSize({ width: 1440, height: 900 });
      },
    );

    await check(
      "gallery: palette survives demo, confirm creates once, partial draft and actual steps",
      async () => {
        const card = page.locator(".template-card").filter({
          has: page.getByRole("heading", {
            name: "Birthday Celebration",
            exact: true,
          }),
        });
        await card.getByLabel("Disco Rose", { exact: true }).check();
        await card.getByRole("link", { name: "View demo" }).click();
        await page.getByLabel("Stardust Silver", { exact: true }).check();
        await page.getByRole("link", { name: "Back to templates" }).click();
        await expect(
          card.getByLabel("Stardust Silver", { exact: true }),
        ).toBeChecked();
        await card.getByRole("button", { name: "Use this template" }).click();
        await page
          .getByLabel("Project name", { exact: true })
          .fill("Gallery birthday");
        const before = requests.filter(
          (request) =>
            request.method === "POST" && /\/sites(?:\?|$)/.test(request.url),
        ).length;
        await page
          .getByRole("button", { name: "Create project", exact: true })
          .dblclick();
        await expect(page).toHaveURL(/\/app\/sites\/[0-9]+\?step=about$/);
        id = Number(/\/sites\/(\d+)/.exec(page.url())[1]);
        editorPath = `/app/sites/${id}`;
        assert.equal(
          requests.filter(
            (request) =>
              request.method === "POST" && /\/sites(?:\?|$)/.test(request.url),
          ).length,
          before + 1,
        );
        await expect(
          page.getByLabel("Celebrant name", { exact: true }),
        ).toHaveValue("");
        await page.getByLabel("Celebrant name", { exact: true }).fill("Alex");
        await step("Date & location");
        await step("About the celebration");
        await expect(
          page.getByLabel("Celebrant name", { exact: true }),
        ).toHaveValue("Alex");
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          page.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        await page.reload();
        await expect(
          page.getByLabel("Celebrant name", { exact: true }),
        ).toHaveValue("Alex");
        await page
          .getByRole("button", { name: "Save & continue", exact: true })
          .click();
        await expect(page).toHaveURL(/step=event/);
        await page.getByLabel("Local date and time").fill("2030-07-18T19:00");
        await page
          .getByLabel("Venue name", { exact: true })
          .fill("The Glasshouse");
        await page
          .getByLabel("Address", { exact: true })
          .fill("London, United Kingdom");
        await page
          .getByRole("button", { name: "Save & continue", exact: true })
          .click();
        await expect(page).toHaveURL(/step=responses/);
        await expect(page.locator(".birthday-fields")).toContainText("RSVP");
        const enable = page.getByLabel("Accept RSVP responses");
        await enable.check();
        await page
          .getByRole("button", { name: "Save & continue", exact: true })
          .click();
        await expect(page).toHaveURL(/step=style/);
        await expect(
          page.getByLabel("Color palette", { exact: true }),
        ).toHaveValue("stardust-silver");
        await shot("form-desktop.png");
        await page.setViewportSize({ width: 390, height: 844 });
        await shot("form-mobile.png");
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.setViewportSize({ width: 1440, height: 900 });
        await page
          .getByRole("button", { name: "Save & continue", exact: true })
          .click();
        await expect(page).toHaveURL(/step=review/);
        await expect(
          page.getByRole("button", { name: "Publish", exact: true }),
        ).toBeDisabled();
        await shot("review-desktop.png");
        await page.setViewportSize({ width: 390, height: 844 });
        await shot("review-mobile.png");
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.setViewportSize({ width: 1440, height: 900 });
        await api(b, "GET", `/sites/${id}`, undefined, 404);
      },
    );

    await check(
      "wizard: delayed save, failed save, back, reload, fallback and dirty leave",
      async () => {
        await step("About the celebration");
        await page
          .getByLabel("Celebrant name", { exact: true })
          .fill("Alex revised");
        const patch = /\/microsites\/v1\/sites\/\d+(?:\?|$)/;
        await page.route(patch, async (route) => {
          if (route.request().method() === "PATCH") {
            await route.abort();
          } else {
            await route.continue();
          }
        });
        await page
          .getByRole("button", { name: "Save & continue", exact: true })
          .click();
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(page).toHaveURL(/step=about/);
        await expect(
          page.getByLabel("Celebrant name", { exact: true }),
        ).toHaveValue("Alex revised");
        await shot("error-desktop.png");
        await page.setViewportSize({ width: 390, height: 844 });
        await shot("error-mobile.png");
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.unroute(patch);
        let release;
        const wait = new Promise((resolve) => {
          release = resolve;
        });
        await page.route(patch, async (route) => {
          if (route.request().method() === "PATCH") {
            await wait;
          }
          await route.continue();
        });
        await page
          .getByRole("button", { name: "Save & continue", exact: true })
          .click();
        await expect(page).toHaveURL(/step=about/);
        release();
        await expect(page).toHaveURL(/step=event/);
        await page.unroute(patch);
        await page.reload();
        await expect(page).toHaveURL(/step=event/);
        await step("Guest responses");
        await page.getByLabel("Accept RSVP responses").uncheck();
        await page
          .getByRole("button", { name: "Save & continue", exact: true })
          .click();
        await expect(page).toHaveURL(/step=style/);
        const catalogRoute = /\/microsites\/v1\/catalog(?:\?|$)/;
        await page.route(catalogRoute, async (route) => {
          const response = await route.fetch();
          const body = await response.json();
          body.data.siteTypes.find(
            (type) => type.id === "birthday-invitation",
          ).features = [];
          await route.fulfill({ response, json: body });
        });
        await page.goto(`${editorPath}?step=responses`);
        await expect(page).toHaveURL(/step=about/);
        await expect(
          page.getByRole("button", { name: /Step .*Guest responses/ }),
        ).toHaveCount(0);
        await page.unroute(catalogRoute);
        await page.goto(`${editorPath}?step=unknown`);
        await expect(page).toHaveURL(/step=about/);
        await page
          .getByLabel("Celebrant name", { exact: true })
          .fill("Dirty name");
        const dialog = page.waitForEvent("dialog");
        const click = page.getByRole("link", { name: /^← Back/ }).click();
        const warning = await dialog;
        await warning.dismiss();
        await click;
        await expect(
          page.getByLabel("Celebrant name", { exact: true }),
        ).toHaveValue("Dirty name");
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          page.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
      },
    );

    await check(
      "wizard: backend readiness links, private preview, publication and independent live draft",
      async () => {
        await page.getByLabel("Invitation message", { exact: true }).fill("");
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          page.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        await step("Review & publish");
        await page
          .locator(".wizard-missing")
          .getByRole("button", { name: "Invitation message", exact: true })
          .click();
        await expect(
          page.getByLabel("Invitation message", { exact: true }),
        ).toBeFocused();
        await page
          .getByLabel("Invitation message", { exact: true })
          .fill("Join Alex for an unforgettable evening.");
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          page.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        await step("Guest responses");
        await page.getByLabel("Accept RSVP responses").check();
        await page
          .getByRole("button", { name: "Save & continue", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Preview invitation", exact: true })
          .click();
        await expect(page).toHaveURL(/\/preview$/);
        await expect(
          page.getByText("Private draft · Not published", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Send RSVP", exact: true }),
        ).toHaveCount(0);
        await page.getByRole("link", { name: "Back to editor" }).click();
        await expect(page).toHaveURL(/step=style/);
        await step("Review & publish");
        const liveBefore = isolatedWp([
          "eval",
          `echo wp_json_encode(get_post_meta(${id}, "_microsite_publication", true));`,
        ]).trim();
        await page.reload();
        await expect(
          page.getByRole("heading", { name: "Review & publish", exact: true }),
        ).toBeVisible();
        assert.equal(
          isolatedWp([
            "eval",
            `echo wp_json_encode(get_post_meta(${id}, "_microsite_publication", true));`,
          ]).trim(),
          liveBefore,
        );
        isolatedWp([
          "microsite",
          "publication-right",
          String(id),
          "grant",
          "--user=test_admin",
        ]);
        await page.reload();
        await page
          .getByRole("button", { name: "Publish", exact: true })
          .click();
        await expect(
          page.getByRole("link", { name: "View live page", exact: true }),
        ).toBeVisible();
        const liveUrl = await page
          .getByRole("link", { name: "View live page", exact: true })
          .getAttribute("href");
        const guest = await guestContext.newPage();
        await guest.goto(liveUrl);
        await expect(
          guest.getByRole("heading", { name: "Dirty name", exact: true }),
        ).toBeVisible();
        await guest
          .getByLabel("Your name", { exact: true })
          .fill("Gallery guest");
        await guest
          .getByRole("button", { name: "Send RSVP", exact: true })
          .click();
        await expect(
          guest.getByText("Your response is saved.", { exact: false }),
        ).toBeVisible();
        await page
          .getByRole("link", { name: "Manage responses", exact: true })
          .click();
        await expect(
          page.getByText("Gallery guest", { exact: true }),
        ).toBeVisible();
        await page.goto(`${editorPath}?step=about`);
        await page
          .getByLabel("Celebrant name", { exact: true })
          .fill("Draft only");
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          page.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        await guest.reload();
        await expect(
          guest.getByRole("heading", { name: "Dirty name", exact: true }),
        ).toBeVisible();
        await expect(
          guest.getByRole("heading", { name: "Draft only", exact: true }),
        ).toHaveCount(0);
        await guest.close();
      },
    );

    await check(
      "gallery: basic page creation, unknown create result, no retries or Vite assets",
      async () => {
        await page.goto("/app/sites/new?type=basic-page");
        await expect(page.locator(".template-card")).toHaveCount(1);
        await page.getByRole("button", { name: "Use this template" }).click();
        await page
          .getByLabel("Project name", { exact: true })
          .fill("Simple test page");
        await page
          .getByRole("button", { name: "Create project", exact: true })
          .click();
        await expect(page.getByLabel("Heading", { exact: true })).toBeVisible();
        assert.equal(await page.locator(".wizard-stepper").count(), 0);
        await page
          .getByLabel("Heading", { exact: true })
          .fill("A basic page still works");
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          page.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        await page.goto("/app/sites/new");
        await page
          .locator(".template-card")
          .first()
          .getByRole("button", { name: "Use this template" })
          .click();
        await page
          .getByLabel("Project name", { exact: true })
          .fill("Lost response");
        await page.route(/\/microsites\/v1\/sites(?:\?|$)/, async (route) => {
          if (route.request().method() === "POST") {
            await route.fetch();
            await route.abort();
          } else {
            await route.continue();
          }
        });
        await page
          .getByRole("button", { name: "Create project", exact: true })
          .click();
        await expect(
          page.getByRole("link", { name: "Check your projects" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Create project", exact: true }),
        ).toBeDisabled();
        await page.unroute(/\/microsites\/v1\/sites(?:\?|$)/);
        await page.getByRole("link", { name: "Check your projects" }).click();
        await expect(
          page.getByRole("heading", { name: "Lost response", exact: true }),
        ).toHaveCount(1);
        assert.equal(
          requests.some((request) =>
            /5173|@vite|react-refresh/.test(request.url),
          ),
          false,
        );
        assert.deepEqual(errors, []);
      },
    );
  } finally {
    await context.close();
    await guestContext.close();
    await browser.close();
  }
}
