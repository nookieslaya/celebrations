import {
  chooseTemplate,
  goStep,
  savedPreview,
  livePreview,
} from "./editor-navigation.mjs";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  chromium,
  webkit,
  expect,
} from "../app/node_modules/@playwright/test/index.mjs";

export async function runCelebrationTests({
  origin,
  api,
  a,
  b,
  check,
  password,
  pluginDirectory,
  isolatedWp,
}) {
  let site;
  let baseDraft;
  const palettes = ["midnight-gold", "disco-rose", "stardust-silver"];
  const artifacts = join(pluginDirectory, "app/test-results/celebration");
  mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch();
  const owner = await browser.newContext({ baseURL: origin });
  const anonymous = await browser.newContext({
    baseURL: origin,
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: artifacts, size: { width: 390, height: 844 } },
  });
  const page = await anonymous.newPage();
  const editor = await owner.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => requests.push(request.url()));
  async function publish(draft = site.draft) {
    site = (await api(a, "PATCH", `/sites/${site.id}`, { draft })).data;
    site = (await api(a, "POST", `/sites/${site.id}/publish`)).data;
  }
  try {
    await check(
      "celebration catalog, default palette and version are independent of birthday-party",
      async () => {
        const catalog = (await api(null, "GET", "/catalog")).data;
        const template = catalog.templates.find(
          (item) => item.id === "birthday-celebration",
        );
        assert.equal(template.version, "1");
        assert.deepEqual(template.allowedAppearance.palette, palettes);
        assert.deepEqual(
          catalog.templates.find((item) => item.id === "birthday-party")
            .allowedAppearance.palette,
          ["electric-citrus", "pink-noir", "cobalt-pop"],
        );
        site = (
          await api(
            a,
            "POST",
            "/sites",
            {
              name: "Celebration test",
              siteType: "birthday-invitation",
              templateId: "birthday-celebration",
            },
            201,
          )
        ).data;
        assert.equal(site.draft.appearance.palette, "midnight-gold");
        assert.equal(site.templateVersion, "1");
        assert.equal(site.schemaVersion, 1);
        const invalid = structuredClone(site.draft);
        invalid.appearance.palette = "electric-citrus";
        await api(a, "PATCH", `/sites/${site.id}`, { draft: invalid }, 400);
        const draft = structuredClone(site.draft);
        Object.assign(draft.content, {
          celebrantName: "Alex",
          age: 50,
          heading: "A night worth celebrating.",
          message:
            "Fifty years of stories. One unforgettable evening with my favourite people.",
          venueName: "The Glasshouse",
          address: "21 Bloomsbury Square\nLondon",
          dressCode: "A little sparkle.",
          additionalInfo: "Dinner at seven. Dancing until late.",
          event: {
            localDateTime: "2030-07-17T19:00",
            timeZone: "Europe/London",
            startsAt: "",
          },
          rsvp: {
            enabled: true,
            maxPartySize: 5,
            deadlineLocal: "2030-07-10T19:00",
            deadlineAt: "",
          },
        });
        site = (await api(a, "PATCH", `/sites/${site.id}`, { draft })).data;
        baseDraft = structuredClone(site.draft);
        isolatedWp([
          "microsite",
          "publication-right",
          String(site.id),
          "grant",
          "--user=test_admin",
        ]);
        await publish();
        await api(b, "GET", `/sites/${site.id}/preview`, undefined, 404);
      },
    );

    await check(
      "celebration shared editor selects palettes, preview works and renderer assets stay lazy",
      async () => {
        const loaded = [];
        editor.on("request", (request) => loaded.push(request.url()));
        await editor.goto("/app/login");
        await editor.getByLabel("Email address").fill("a@example.invalid");
        await editor.getByLabel("Password", { exact: true }).fill(password);
        await editor
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await expect(editor).toHaveURL(/\/app\/sites\/?$/);
        await editor.goto("/app/sites/new");
        await chooseTemplate(
          editor,
          "birthday-invitation",
          "Birthday Celebration",
        );
        await editor
          .getByLabel("Project name")
          .fill("New celebration from catalog");
        await editor
          .getByRole("button", { name: "Create project", exact: true })
          .click();
        await goStep(editor, "style");
        await expect(editor.getByLabel("Color palette")).toHaveValue(
          "midnight-gold",
        );
        assert.equal(
          await editor.getByLabel("Color palette").locator("option").count(),
          3,
        );
        await editor.getByLabel("Color palette").selectOption("disco-rose");
        await editor
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          editor.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        await editor.reload();
        await expect(editor.getByLabel("Color palette")).toHaveValue(
          "disco-rose",
        );
        await expect(livePreview(editor).locator(".celebration")).toBeVisible();
        assert.equal(
          loaded.some((url) => /BirthdayCelebration-/.test(url)),
          true,
        );
        await editor.goto(`/app/sites/${site.id}/preview`);
        await expect(
          savedPreview(editor).getByRole("button", {
            name: "Open invitation",
            exact: true,
          }),
        ).toBeVisible();
        await savedPreview(editor)
          .getByRole("button", { name: "Skip intro", exact: true })
          .click();
        await expect(
          savedPreview(editor).getByRole("heading", { name: "The Glasshouse" }),
        ).toBeVisible();
        await expect(
          savedPreview(editor).getByRole("button", { name: "Send RSVP" }),
        ).toBeDisabled();
        await expect(
          savedPreview(editor).getByText(
            /Preview only — guest responses cannot be sent/,
          ),
        ).toBeVisible();
      },
    );

    await check(
      "celebration real opening, keyboard focus, bounded confetti, pause/resume, skip and remount are functional",
      async () => {
        await page.goto(site.publication.publicUrl);
        await expect(
          page.getByRole("button", { name: "Open invitation", exact: true }),
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: join(artifacts, "cover-390.png") });
        await page
          .getByRole("button", { name: "Open invitation", exact: true })
          .focus();
        await page.keyboard.press("Enter");
        await expect(page.locator(".celebration-name")).toBeFocused();
        await expect(page.locator(".celebration")).toHaveAttribute(
          "data-reveal-state",
          "complete",
        );
        await expect(page.locator(".celebration-confetti")).toHaveAttribute(
          "data-bursts",
          "1",
        );
        await expect(page.locator(".celebration-confetti")).toHaveAttribute(
          "data-burst-active",
          "false",
        );
        await expect(
          page.getByRole("heading", {
            name: "A night worth celebrating.",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "I’ll be there" }),
        ).toBeVisible();
        await page.screenshot({ path: join(artifacts, "hero-390.png") });
        await page
          .getByRole("button", { name: "Pause animations", exact: true })
          .click();
        await expect(page.locator(".celebration-canvas")).toHaveAttribute(
          "data-running",
          "false",
        );
        await expect(page.locator(".celebration-balloon").first()).toHaveCSS(
          "animation-play-state",
          "paused",
        );
        await page
          .getByRole("button", { name: "Resume animations", exact: true })
          .click();
        await expect(page.locator(".celebration-canvas")).toHaveAttribute(
          "data-running",
          "true",
        );
        await page
          .getByRole("link", { name: "The details", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "The Glasshouse" }),
        ).toBeVisible();
        await expect(page.locator(".celebration")).toHaveAttribute(
          "data-decorations-active",
          "false",
        );
        await page
          .locator("#celebration-details")
          .screenshot({ path: join(artifacts, "details-390.png") });
        await page.reload();
        await page
          .getByRole("button", { name: "Skip intro", exact: true })
          .click();
        await expect(page.locator("#celebration-details")).toBeFocused();
        await expect(
          page.getByRole("heading", { name: "The Glasshouse" }),
        ).toBeVisible();
        assert.equal(errors.length, 0, errors.join("\n"));
        assert.equal(
          requests.some((url) => /5173|\/assets\/app-|\/auth\//.test(url)),
          false,
        );
      },
    );

    await check(
      "celebration live RSVP uses the existing API and its closed state; snapshots isolate palette edits",
      async () => {
        await page.locator("#celebration-rsvp").scrollIntoViewIfNeeded();
        await page.getByLabel("Your name").fill("Celebration Guest");
        await page
          .getByLabel("How many people are coming, including you?")
          .fill("2");
        await page
          .locator("#celebration-rsvp")
          .screenshot({ path: join(artifacts, "rsvp-390.png") });
        await page
          .getByRole("button", { name: "Send RSVP", exact: true })
          .click();
        await expect(
          page.getByText("Your response is saved.", { exact: true }),
        ).toBeVisible();
        const responses = (await api(a, "GET", `/sites/${site.id}/responses`))
          .data;
        assert.equal(responses.summary.participants, 2);
        await api(
          a,
          "DELETE",
          `/sites/${site.id}/responses/${responses.items[0].id}`,
        );
        const draft = structuredClone(site.draft);
        draft.appearance.palette = "disco-rose";
        site = (await api(a, "PATCH", `/sites/${site.id}`, { draft })).data;
        await page.reload();
        await expect(page.locator(".celebration")).toHaveAttribute(
          "data-palette",
          "midnight-gold",
        );
        await publish();
        await page.reload();
        await expect(page.locator(".celebration")).toHaveAttribute(
          "data-palette",
          "disco-rose",
        );
        isolatedWp([
          "option",
          "update",
          "microsite_test_rsvp_now",
          String(Date.parse(site.draft.content.rsvp.deadlineAt) / 1000),
        ]);
        await page.reload();
        await page
          .getByRole("link", { name: "The details", exact: true })
          .click();
        await expect(
          page
            .locator("#celebration-rsvp")
            .getByText("RSVP is closed.", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Send RSVP", exact: true }),
        ).toHaveCount(0);
        isolatedWp(["option", "delete", "microsite_test_rsvp_now"]);
      },
    );

    await check(
      "celebration visual matrix: all palettes at four sizes, reduced motion, long text and small enlarged layout",
      async () => {
        const still = await browser.newContext({
          baseURL: origin,
          reducedMotion: "reduce",
        });
        const review = await still.newPage();
        try {
          for (const palette of palettes) {
            const draft = structuredClone(site.draft);
            draft.appearance.palette = palette;
            await publish(draft);
            for (const [width, height] of [
              [375, 812],
              [390, 844],
              [768, 1024],
              [1440, 900],
            ]) {
              await review.setViewportSize({ width, height });
              await review.goto(site.publication.publicUrl);
              await expect(review.locator(".celebration-name")).toBeVisible();
              await review.evaluate(() => document.fonts.ready);
              await expect(
                review.getByRole("button", {
                  name: "Open invitation",
                  exact: true,
                }),
              ).toHaveCount(0);
              await expect(
                review.locator(".celebration-canvas"),
              ).toHaveAttribute("data-running", "false");
              await expect(
                review.getByRole("button", {
                  name: "Reduced motion",
                  exact: true,
                }),
              ).toBeDisabled();
              await review.screenshot({
                path: join(artifacts, `reduced-${palette}-${width}.png`),
                fullPage: true,
              });
              assert.equal(
                await review.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
                true,
              );
            }
          }
          const maximum = structuredClone(site.draft);
          maximum.content.celebrantName = "Aleksandra Żółć "
            .repeat(5)
            .slice(0, 80);
          maximum.content.heading = "A beautiful celebration "
            .repeat(6)
            .slice(0, 120);
          maximum.content.message =
            "Every story deserves an unforgettable night. "
              .repeat(15)
              .slice(0, 600);
          delete maximum.content.age;
          delete maximum.content.dressCode;
          delete maximum.content.additionalInfo;
          maximum.content.rsvp.enabled = false;
          await publish(maximum);
          await review.setViewportSize({ width: 320, height: 720 });
          await review.goto(site.publication.publicUrl);
          await review.evaluate(() => {
            document.documentElement.style.fontSize = "200%";
          });
          await expect(review.locator(".celebration-age")).toHaveCount(0);
          await expect(
            review.getByText("RSVP is not enabled for this invitation.", {
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            review.getByRole("link", {
              name: "Discover the evening",
              exact: true,
            }),
          ).toBeVisible();
          assert.equal(
            await review.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await review.screenshot({
            path: join(artifacts, "maximum-320-enlarged.png"),
            fullPage: true,
          });
          maximum.content.age = 120;
          maximum.content.venueName = "V".repeat(120);
          maximum.content.address = "Address ".repeat(30).slice(0, 240);
          maximum.content.heading = "H".repeat(120);
          maximum.content.dressCode = "D".repeat(120);
          maximum.content.additionalInfo = "Additional details "
            .repeat(30)
            .slice(0, 500);
          await publish(maximum);
          await review.goto(site.publication.publicUrl);
          await review.evaluate(() => {
            document.documentElement.style.fontSize = "200%";
          });
          await expect(review.locator(".celebration-age")).toHaveText("120");
          assert.equal(
            await review.evaluate(() => {
              const range = document.createRange();
              range.selectNodeContents(
                document.querySelector(".celebration-age"),
              );
              const bounds = range.getBoundingClientRect();
              return (
                bounds.left >= 0 &&
                bounds.right <= innerWidth &&
                document.documentElement.scrollWidth <= innerWidth
              );
            }),
            true,
          );
          await review.screenshot({
            path: join(artifacts, "maximum-optional-320.png"),
            fullPage: true,
          });
        } finally {
          await still.close();
        }
      },
    );

    await check(
      "refined envelope and confetti work across palettes in WebKit, with safe skip memory and preview replay",
      async () => {
        const safari = await webkit.launch();
        const storageState = await owner.storageState();
        const reviewFolder = join(
          pluginDirectory,
          "app/test-results/celebration-refinement",
        );
        mkdirSync(reviewFolder, { recursive: true });
        try {
          for (const palette of palettes) {
            const draft = structuredClone(baseDraft);
            draft.appearance.palette = palette;
            await publish(draft);
            for (const [width, height] of [
              [390, 844],
              [1440, 900],
            ]) {
              const context = await safari.newContext({
                baseURL: origin,
                viewport: { width, height },
                reducedMotion: "no-preference",
              });
              const review = await context.newPage();
              const failures = [];
              review.on("pageerror", (error) => failures.push(error.message));
              try {
                await review.goto(site.publication.publicUrl);
                const open = review.getByRole("button", {
                  name: "Open invitation",
                  exact: true,
                });
                await expect(open).toBeVisible();
                await review.evaluate(() => document.fonts.ready);
                await expect(
                  review.locator(".invitation-envelope-card"),
                ).toBeHidden();
                await expect(
                  review.locator(".invitation-envelope-flap-back"),
                ).toHaveCSS("visibility", "hidden");
                await review.screenshot({
                  path: join(
                    reviewFolder,
                    `webkit-${palette}-${width}-closed.png`,
                  ),
                });
                await open.evaluate((button) => {
                  button.click();
                  button.click();
                });
                await expect(review.locator(".celebration")).toHaveAttribute(
                  "data-intro-state",
                  "opening",
                );
                await expect(
                  review.locator(".celebration-cover"),
                ).toHaveAttribute("data-phase", "card");
                await expect(
                  review.locator(".invitation-envelope-card"),
                ).toBeVisible();
                await expect(
                  review.locator(".invitation-card-name"),
                ).toHaveText(baseDraft.content.celebrantName);
                await expect(
                  review.locator(".invitation-envelope-flap-layer"),
                ).toHaveCSS("z-index", "1");
                await review.screenshot({
                  path: join(
                    reviewFolder,
                    `webkit-${palette}-${width}-card.png`,
                  ),
                });
                await expect(review.locator(".celebration")).toHaveAttribute(
                  "data-intro-state",
                  "opened",
                );
                await expect(review.locator(".celebration-name")).toBeFocused();
                await expect(review.locator(".celebration-cover")).toBeHidden();
                await expect(
                  review.locator(".celebration-confetti"),
                ).toHaveAttribute("data-bursts", "1");
                await review.screenshot({
                  path: join(
                    reviewFolder,
                    `webkit-${palette}-${width}-hero.png`,
                  ),
                });
                await expect(
                  review.locator(".celebration-confetti"),
                ).toHaveAttribute("data-burst-active", "false");
                await review
                  .getByRole("button", {
                    name: "Pause animations",
                    exact: true,
                  })
                  .click();
                await expect(
                  review.locator(".celebration-canvas"),
                ).toHaveAttribute("data-running", "false");
                await expect(
                  review.locator(".celebration-disco-swing"),
                ).toHaveCSS("animation-play-state", "paused");
                await review
                  .getByRole("button", {
                    name: "Resume animations",
                    exact: true,
                  })
                  .click();
                assert.equal(
                  await review
                    .locator(".celebration-disco img")
                    .evaluate(
                      (image) => image.complete && image.naturalWidth === 640,
                    ),
                  true,
                );
                assert.equal(
                  await review.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                  ),
                  true,
                );
                await review.reload();
                await review
                  .getByRole("button", { name: "Open invitation", exact: true })
                  .click();
                await expect(review.locator(".celebration")).toHaveAttribute(
                  "data-intro-state",
                  "opening",
                );
                await review
                  .getByRole("button", { name: "Skip intro", exact: true })
                  .click();
                await expect(review.locator(".celebration-cover")).toBeHidden();
                await expect(
                  review.locator("#celebration-details"),
                ).toBeFocused();
                await expect(
                  review.locator(".celebration-confetti"),
                ).toHaveAttribute("data-burst-active", "false");
                const keys = await review.evaluate(() =>
                  Object.keys(sessionStorage).filter((key) =>
                    key.startsWith("celebration-intro:"),
                  ),
                );
                assert.equal(keys.length, 1);
                assert.ok(keys[0].includes(site.publicId));
                await review.reload();
                await expect(review.locator(".celebration-name")).toBeVisible();
                await expect(
                  review.getByRole("button", {
                    name: "Open invitation",
                    exact: true,
                  }),
                ).toHaveCount(0);
                await expect(
                  review.getByRole("button", {
                    name: "Send RSVP",
                    exact: true,
                  }),
                ).toBeEnabled();
                assert.deepEqual(failures, []);
              } finally {
                await context.close();
              }
            }
          }
          const previewContext = await safari.newContext({
            baseURL: origin,
            storageState,
            viewport: { width: 390, height: 844 },
          });
          try {
            const preview = await previewContext.newPage();
            await preview.goto(`/app/sites/${site.id}/preview`);
            await savedPreview(preview)
              .getByRole("button", { name: "Skip intro", exact: true })
              .click();
            await expect(
              savedPreview(preview).getByRole("button", {
                name: "Replay intro",
                exact: true,
              }),
            ).toBeVisible();
            await savedPreview(preview)
              .getByRole("button", { name: "Replay intro", exact: true })
              .click();
            await expect(
              savedPreview(preview).getByRole("button", {
                name: "Open invitation",
                exact: true,
              }),
            ).toBeVisible();
            await savedPreview(preview)
              .getByRole("button", { name: "Open invitation", exact: true })
              .click();
            await savedPreview(preview)
              .getByRole("button", { name: "Skip intro", exact: true })
              .click();
            await expect(savedPreview(preview).locator(".celebration-cover")).toBeHidden();
            await expect(
              savedPreview(preview).getByRole("button", { name: "Send RSVP", exact: true }),
            ).toBeDisabled();
            await savedPreview(preview)
              .getByRole("button", { name: "Replay intro", exact: true })
              .click();
            await savedPreview(preview)
              .getByRole("button", { name: "Open invitation", exact: true })
              .click();
            await expect(savedPreview(preview).locator(".celebration-name")).toBeFocused();
          } finally {
            await previewContext.close();
          }
          const longDraft = structuredClone(baseDraft);
          longDraft.content.celebrantName = "Aleksandra Żółć "
            .repeat(5)
            .slice(0, 80);
          delete longDraft.content.age;
          await publish(longDraft);
          const longContext = await safari.newContext({
            baseURL: origin,
            viewport: { width: 390, height: 844 },
          });
          try {
            const longPage = await longContext.newPage();
            await longPage.goto(site.publication.publicUrl);
            await longPage
              .getByRole("button", { name: "Open invitation", exact: true })
              .click();
            await expect(
              longPage.locator(".celebration-cover"),
            ).toHaveAttribute("data-phase", "card");
            await expect(longPage.locator(".invitation-card-name")).toHaveText(
              longDraft.content.celebrantName,
            );
            await expect(
              longPage.locator(".invitation-card-occasion"),
            ).toHaveText("A night to remember");
            assert.equal(
              await longPage
                .locator(".invitation-envelope-card")
                .evaluate((card) => {
                  const name = card
                    .querySelector(".invitation-card-name")
                    .getBoundingClientRect();
                  const bounds = card.getBoundingClientRect();
                  return (
                    name.left >= bounds.left &&
                    name.right <= bounds.right &&
                    name.top >= bounds.top &&
                    name.bottom <= bounds.bottom
                  );
                }),
              true,
            );
            await longPage.screenshot({
              path: join(reviewFolder, "webkit-long-name-no-age-card.png"),
            });
            await expect(longPage.locator(".celebration")).toHaveAttribute(
              "data-intro-state",
              "opened",
            );
            await expect(longPage.locator(".celebration-age-wrap")).toHaveCount(
              0,
            );
            await expect(
              longPage.getByRole("button", { name: "Send RSVP", exact: true }),
            ).toBeEnabled();
          } finally {
            await longContext.close();
          }
        } finally {
          await safari.close();
        }
      },
    );
  } finally {
    await owner.close();
    await anonymous.close();
    await browser.close();
  }
}
