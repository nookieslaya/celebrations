import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  chromium,
  expect,
} from "../app/node_modules/@playwright/test/index.mjs";
import { goStep } from "./editor-navigation.mjs";

export async function runPreviewTests({
  origin,
  api,
  a,
  b,
  check,
  password,
  pluginDirectory,
  isolatedWp,
}) {
  const artifacts = join(pluginDirectory, "app/test-results/live-preview");
  mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch();
  const owner = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const anonymous = await browser.newContext({
    baseURL: origin,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await owner.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) =>
    requests.push({ method: request.method(), url: request.url() }),
  );
  page.on("dialog", (dialog) => dialog.accept());
  const sites = [];
  const catalog = (await api(null, "GET", "/catalog")).data;
  let liveFrame;
  function frame() {
    return page.frameLocator('iframe[title="Live preview"]');
  }
  async function ready() {
    await expect(
      page.locator(".renderer-frame[data-ready=true]"),
    ).toBeVisible();
    await expect(
      frame().locator(".celebration, .party, .draft-preview"),
    ).toBeVisible();
    await expect(
      frame().locator(".invitation-assets-gate[data-ready=false]"),
    ).toHaveCount(0);
    liveFrame = page
      .frames()
      .find((candidate) => candidate.url().includes("/preview-frame/"));
  }
  try {
    await check(
      "preview: protected empty iframe, real renderers and public-style parity for all templates",
      async () => {
        const denied = await anonymous.request.get("/app/preview-frame/");
        assert.equal(denied.status(), 403);
        assert.doesNotMatch(
          await denied.text(),
          /microsite-config|authCsrfToken|nonce/,
        );
        await page.goto("/app/login");
        await page.getByLabel("Email address").fill("a@example.invalid");
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await expect(page).toHaveURL(/\/app\/sites$/);
        const shell = await owner.request.get("/app/preview-frame/");
        assert.equal(shell.status(), 200);
        assert.match(
          shell.headers()["content-security-policy"],
          /connect-src 'none'/,
        );
        assert.doesNotMatch(
          await shell.text(),
          /microsite-config|microsite-public|authCsrfToken|nonce|Alex/,
        );
        for (const template of catalog.templates) {
          const site = (
            await api(
              a,
              "POST",
              "/sites",
              {
                name: `Preview ${template.name}`,
                siteType: template.siteTypes[0],
                templateId: template.id,
                draft: template.demoDraft,
              },
              201,
            )
          ).data;
          isolatedWp([
            "microsite",
            "publication-right",
            String(site.id),
            "grant",
            "--user=test_admin",
          ]);
          const published = (await api(a, "POST", `/sites/${site.id}/publish`))
            .data;
          sites.push(published);
          await page.goto(`/app/sites/${site.id}`);
          await ready();
          assert.equal(
            await page
              .locator(".birthday-summary, .wizard-template-thumbnail")
              .count(),
            0,
          );
          assert.equal(await page.locator("iframe").count(), 1);
          assert.equal(
            new URL(await page.locator("iframe").getAttribute("src"), origin)
              .search,
            "",
          );
          const publicPage = await anonymous.newPage();
          await publicPage.goto(published.publication.publicUrl);
          const selector =
            template.id === "birthday-celebration"
              ? ".celebration-name"
              : template.id === "birthday-party"
                ? ".party-name"
                : ".draft-preview h2";
          await expect(frame().locator(selector)).toBeVisible();
          await expect(publicPage.locator(selector)).toBeVisible();
          await publicPage.evaluate(() => document.fonts.ready);
          await liveFrame.evaluate(() => document.fonts.ready);
          const style = (element) => {
            const css = getComputedStyle(element);
            return {
              family: css.fontFamily,
              size: css.fontSize,
              color: css.color,
              lineHeight: css.lineHeight,
            };
          };
          assert.deepEqual(
            await frame().locator(selector).evaluate(style),
            await publicPage.locator(selector).evaluate(style),
          );
          await page
            .locator(".live-preview-panel")
            .screenshot({
              path: join(artifacts, `embedded-${template.id}.png`),
            });
          await publicPage.screenshot({
            path: join(artifacts, `public-${template.id}.png`),
          });
          await publicPage.close();
        }
      },
    );

    await check(
      "preview: unsaved text, wall-clock date, palettes and RSVP update without writes or intro restarts",
      async () => {
        for (const site of sites) {
          await page.goto(`/app/sites/${site.id}`);
          await ready();
          await liveFrame.evaluate(() => {
            document.documentElement.dataset.instanceMarker = "same-frame";
          });
          const writes = requests.filter((request) =>
            ["POST", "PATCH", "DELETE"].includes(request.method),
          ).length;
          if (site.siteType === "birthday-invitation") {
            await goStep(page, "about");
            await page
              .getByLabel("Celebrant name", { exact: true })
              .fill("Unsaved Alex");
            await expect(
              frame().getByRole("heading", {
                name: "Unsaved Alex",
                exact: true,
              }),
            ).toBeVisible();
            await page
              .getByLabel("Invitation heading", { exact: true })
              .fill("An unsaved celebration");
            await expect(
              frame().getByText("An unsaved celebration", { exact: true }),
            ).toBeVisible();
            await goStep(page, "event");
            await page
              .getByLabel("Local date and time")
              .fill("2030-08-20T21:15");
            const date =
              site.templateId === "birthday-party"
                ? ".party-date"
                : ".celebration-details";
            await expect(frame().locator(date)).toContainText("20 August 2030");
            await expect(frame().locator(date)).toContainText("21:15");
            await page
              .getByLabel("Time zone", { exact: true })
              .fill("Invalid/Zone");
            await expect(frame().locator(date)).not.toContainText("21:15");
            await page
              .getByLabel("Time zone", { exact: true })
              .fill("Europe/London");
            await goStep(page, "responses");
            await page.getByLabel("Accept RSVP responses").check();
            await expect(
              frame().getByRole("button", { name: "Send RSVP", exact: true }),
            ).toBeDisabled();
            await frame()
              .getByLabel("Your name", { exact: true })
              .fill("Preview guest");
            await frame().locator(".rsvp-card form").dispatchEvent("submit");
            const responses = (
              await api(a, "GET", `/sites/${site.id}/responses`)
            ).data;
            assert.equal(responses.pagination.total, 0);
            await page.getByLabel("Accept RSVP responses").uncheck();
            await expect(
              frame().getByRole("button", { name: "Send RSVP", exact: true }),
            ).toHaveCount(0);
            await goStep(page, "style");
            const template = catalog.templates.find(
              (item) => item.id === site.templateId,
            );
            const palette = template.allowedAppearance.palette[1];
            await page
              .getByLabel("Color palette", { exact: true })
              .selectOption(palette);
            await expect(
              frame().locator(".celebration, .party"),
            ).toHaveAttribute("data-palette", palette);
            await expect(
              frame().locator(".celebration, .party"),
            ).toHaveAttribute("data-opened", "true");
          } else {
            await page
              .getByLabel("Heading", { exact: true })
              .fill("An unsaved basic page");
            await expect(
              frame().getByRole("heading", {
                name: "An unsaved basic page",
                exact: true,
              }),
            ).toBeVisible();
            await page
              .getByLabel("Accent color", { exact: true })
              .selectOption("rose");
            await expect(frame().locator(".draft-preview")).toHaveAttribute(
              "data-accent",
              "rose",
            );
            await page.getByLabel("Heading", { exact: true }).fill("");
            await expect(
              frame().getByRole("heading", {
                name: "Your heading here",
                exact: true,
              }),
            ).toBeVisible();
          }
          await expect(frame().locator("html")).toHaveAttribute(
            "data-instance-marker",
            "same-frame",
          );
          assert.equal(
            requests.filter((request) =>
              ["POST", "PATCH", "DELETE"].includes(request.method),
            ).length,
            writes,
          );
          const saved = (await api(a, "GET", `/sites/${site.id}`)).data;
          assert.deepEqual(saved.draft, site.draft);
          assert.equal(saved.publication.hasUnpublishedChanges, false);
          const publicHtml = await (
            await anonymous.request.get(site.publication.publicUrl)
          ).text();
          assert.doesNotMatch(
            publicHtml,
            /Unsaved Alex|An unsaved celebration|An unsaved basic page/,
          );
          await api(b, "GET", `/sites/${site.id}/preview`, undefined, 404);
        }
      },
    );

    await check(
      "preview: real viewport switching, safe message handshake and saved-draft source",
      async () => {
        const site = sites.find(
          (item) => item.templateId === "birthday-celebration",
        );
        await page.goto(`/app/sites/${site.id}?step=about`);
        await ready();
        assert.equal(await liveFrame.evaluate(() => innerWidth), 390);
        await expect(frame().locator(".celebration-masthead")).toHaveCSS(
          "height",
          "62px",
        );
        await page
          .getByRole("button", { name: "Desktop", exact: true })
          .click();
        await expect(page.locator("iframe")).toHaveAttribute("width", "1440");
        await expect(frame().locator(".celebration-masthead")).toHaveCSS(
          "height",
          "76px",
        );
        await page.getByRole("button", { name: "Mobile", exact: true }).click();
        await page
          .getByLabel("Celebrant name", { exact: true })
          .fill("Keep this unsaved name");
        await expect(
          frame().getByRole("heading", {
            name: "Keep this unsaved name",
            exact: true,
          }),
        ).toBeVisible();
        await page.locator("iframe").evaluate((element) => {
          element.contentWindow.postMessage(
            {
              channel: "microsite-preview-v1",
              type: "render",
              document: { siteType: "birthday-invitation" },
              context: { active: true },
            },
            location.origin,
          );
        });
        await expect(
          frame().getByRole("heading", {
            name: "Keep this unsaved name",
            exact: true,
          }),
        ).toBeVisible();
        await liveFrame.evaluate(() =>
          window.postMessage(
            { channel: "microsite-preview-v1", type: "render", context: null },
            location.origin,
          ),
        );
        await expect(
          frame().getByRole("heading", {
            name: "Keep this unsaved name",
            exact: true,
          }),
        ).toBeVisible();
        await page.screenshot({
          path: join(artifacts, "panel-desktop.png"),
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(frame().locator("html")).toHaveAttribute(
          "data-preview-active",
          "false",
        );
        await page
          .getByRole("button", { name: "Preview", exact: true })
          .click();
        await expect(frame().locator("html")).toHaveAttribute(
          "data-preview-active",
          "true",
        );
        await expect(
          frame().getByRole("heading", {
            name: "Keep this unsaved name",
            exact: true,
          }),
        ).toBeVisible();
        await page.screenshot({
          path: join(artifacts, "panel-mobile-preview.png"),
          fullPage: true,
        });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.getByRole("button", { name: "Edit", exact: true }).click();
        await expect(
          page.getByLabel("Celebrant name", { exact: true }),
        ).toHaveValue("Keep this unsaved name");
        await expect(frame().locator("html")).toHaveAttribute(
          "data-preview-active",
          "false",
        );
        await page.screenshot({
          path: join(artifacts, "panel-mobile-edit.png"),
          fullPage: true,
        });
        await page.setViewportSize({ width: 1440, height: 900 });
        // Explicit discard is confined to these test fixture edits.
        await page.goto(`/app/sites/${site.id}/preview`);
        await expect(
          page.getByText("Saved draft preview · Changes are not published", {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page
            .frameLocator('iframe[title="Saved draft preview"]')
            .getByRole("heading", { name: "Alex", exact: true }),
        ).toBeVisible();
        await expect(
          page
            .frameLocator('iframe[title="Saved draft preview"]')
            .getByRole("heading", {
              name: "Keep this unsaved name",
              exact: true,
            }),
        ).toHaveCount(0);
      },
    );

    await check(
      "preview: Replay opening is explicit, repeated replay is bounded, hidden effects pause and production is independent of Vite",
      async () => {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        for (const site of sites.filter(
          (item) => item.siteType === "birthday-invitation",
        )) {
          await page.goto(`/app/sites/${site.id}?step=about`);
          await ready();
          await expect(frame().locator(".celebration, .party")).toHaveAttribute(
            "data-opened",
            "true",
          );
          await page
            .getByRole("button", { name: "Replay opening", exact: true })
            .click();
          if (site.templateId === "birthday-celebration") {
            await expect(frame().locator(".celebration")).toHaveAttribute(
              "data-intro-state",
              "opening",
            );
            await page
              .getByRole("button", { name: "Replay opening", exact: true })
              .click();
            await expect(frame().locator(".celebration")).toHaveAttribute(
              "data-intro-state",
              "opened",
              { timeout: 7000 },
            );
            await expect(
              frame().locator(".celebration-confetti"),
            ).toHaveAttribute("data-bursts", "1");
          } else {
            await expect(frame().locator(".party-confetti-piece")).toHaveCount(
              42,
            );
            await expect(frame().locator(".party")).toHaveAttribute(
              "data-opened",
              "true",
            );
          }
          await page
            .getByLabel("Celebrant name", { exact: true })
            .fill("Edit after replay");
          await expect(
            frame().getByRole("heading", {
              name: "Edit after replay",
              exact: true,
            }),
          ).toBeVisible();
          await expect(frame().locator(".celebration, .party")).toHaveAttribute(
            "data-opened",
            "true",
          );
          await page.setViewportSize({ width: 390, height: 844 });
          await expect(frame().locator("html")).toHaveAttribute(
            "data-preview-active",
            "false",
          );
          if (site.templateId === "birthday-celebration") {
            await expect(
              frame().locator(".celebration-canvas"),
            ).toHaveAttribute("data-running", "false");
          }
          assert.equal(
            await page.evaluate(() => document.body.style.overflow),
            "",
          );
          await page.setViewportSize({ width: 1440, height: 900 });
        }
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
    await owner.close();
    await anonymous.close();
    await browser.close();
  }
}
