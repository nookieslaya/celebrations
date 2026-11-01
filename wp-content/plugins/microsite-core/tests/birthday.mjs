import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  chromium,
  expect,
} from "../app/node_modules/@playwright/test/index.mjs";

export async function runBirthdayTests({
  origin,
  api,
  a,
  b,
  admin,
  check,
  password,
  pluginDirectory,
  isolatedWp,
}) {
  let defaultDraft;
  let saved;
  const selection = {
    name: "Birthday HTTP draft",
    siteType: "birthday-invitation",
    templateId: "birthday-party",
  };

  await check(
    "birthday catalog and incomplete defaults use the shared CRUD",
    async () => {
      const catalog = (await api(null, "GET", "/catalog")).data;
      assert.equal(
        catalog.siteTypes.some((type) => type.id === selection.siteType),
        true,
      );
      const template = catalog.templates.find(
        (item) => item.id === selection.templateId,
      );
      assert.equal(template.version, "1");
      assert.equal(template.allowedAppearance.palette.length, 3);
      saved = (await api(a, "POST", "/sites", selection, 201)).data;
      defaultDraft = structuredClone(saved.draft);
      assert.equal(saved.schemaVersion, 1);
      assert.equal(saved.templateVersion, "1");
      assert.equal(saved.draft.content.event.localDateTime, "");
      assert.equal(saved.draft.content.event.startsAt, "");
      assert.equal(saved.draft.content.event.timeZone, "Europe/London");
      assert.equal(saved.draft.content.age, undefined);
    },
  );

  await check(
    "birthday backend validates age, palette, text limits, HTML and unknown properties",
    async () => {
      const badDrafts = [
        { ...defaultDraft, appearance: { palette: "custom" } },
        ...[-1, 0, 121, 3.5, "30"].map((age) => ({
          ...defaultDraft,
          content: { ...defaultDraft.content, age },
        })),
        {
          ...defaultDraft,
          content: { ...defaultDraft.content, celebrantName: "x".repeat(81) },
        },
        {
          ...defaultDraft,
          content: { ...defaultDraft.content, message: "x".repeat(601) },
        },
        {
          ...defaultDraft,
          content: { ...defaultDraft.content, additionalInfo: "x".repeat(501) },
        },
        {
          ...defaultDraft,
          content: {
            ...defaultDraft.content,
            heading: "<script>alert(1)</script>",
          },
        },
        {
          ...defaultDraft,
          content: { ...defaultDraft.content, unexpected: true },
        },
        {
          ...defaultDraft,
          content: {
            ...defaultDraft.content,
            event: { ...defaultDraft.content.event, timeZone: "Mars/Orbit" },
          },
        },
      ];
      const before = await api(a, "GET", `/sites/${saved.id}`);
      for (const draft of badDrafts) {
        await api(a, "PATCH", `/sites/${saved.id}`, { draft }, 400);
        assert.deepEqual(await api(a, "GET", `/sites/${saved.id}`), before);
      }
      await api(
        a,
        "POST",
        "/sites",
        { ...selection, templateId: "basic" },
        400,
      );
    },
  );

  await check(
    "birthday dates reject calendar errors, DST gaps and folds; UTC is derived from local time and IANA",
    async () => {
      for (const [localDateTime, fragment] of [
        ["2027-02-30T12:00", "valid local date"],
        ["2027-03-28T01:30", "does not exist"],
        ["2027-10-31T01:30", "occurs twice"],
      ]) {
        const draft = structuredClone(defaultDraft);
        draft.content.event.localDateTime = localDateTime;
        const result = await api(
          a,
          "PATCH",
          `/sites/${saved.id}`,
          { draft },
          400,
        );
        assert.match(result.message, new RegExp(fragment));
      }
      const draft = structuredClone(defaultDraft);
      draft.content.celebrantName = "Alex";
      draft.content.age = 30;
      draft.content.event.localDateTime = "2027-07-10T19:30";
      draft.content.event.startsAt = "2020-01-01T00:00:00Z";
      draft.content.venueName = "The Loft";
      draft.content.address = "London, United Kingdom";
      saved = (await api(a, "PATCH", `/sites/${saved.id}`, { draft })).data;
      assert.equal(saved.draft.content.event.startsAt, "2027-07-10T18:30:00Z");
      const kathmandu = structuredClone(saved.draft);
      kathmandu.content.event.timeZone = "Asia/Kathmandu";
      const result = (
        await api(a, "PATCH", `/sites/${saved.id}`, { draft: kathmandu })
      ).data;
      assert.equal(result.draft.content.event.startsAt, "2027-07-10T13:45:00Z");
      const historical = structuredClone(defaultDraft);
      historical.content.event.localDateTime = "1900-01-01T12:00";
      historical.content.event.timeZone = "Asia/Kolkata";
      const precise = (await api(a, "PATCH", `/sites/${saved.id}`, { draft: historical })).data;
      assert.equal(precise.draft.content.event.startsAt, "1900-01-01T06:38:50Z");
      await api(a, "PATCH", `/sites/${saved.id}`, { draft: saved.draft });
    },
  );

  await check(
    "birthday private preview enforces ownership in REST and HTML without putting secrets in the URL",
    async () => {
      const own = await api(a, "GET", `/sites/${saved.id}/preview`);
      assert.equal(own.data.draft.content.celebrantName, "Alex");
      await api(admin, "GET", `/sites/${saved.id}/preview`);
      await api(b, "GET", `/sites/${saved.id}/preview`, undefined, 404);
      await api(null, "GET", `/sites/${saved.id}/preview`, undefined, 401);
      const foreign = await b.context.get(`/app/sites/${saved.id}/preview`);
      assert.equal(foreign.status(), 404);
      assert.match(foreign.headers()["cache-control"], /no-store/);
      assert.match(foreign.headers()["x-robots-tag"], /noindex/);
      assert.equal(
        (await foreign.text()).includes("Birthday HTTP draft"),
        false,
      );
    },
  );

  await check(
    "birthday demo helper is idempotent and assigns the chosen existing owner",
    async () => {
      const script = join(pluginDirectory, "scripts/create-birthday-demo.php");
      const before = Number(
        isolatedWp([
          "post",
          "list",
          "--post_type=ms_site",
          "--author=1",
          "--format=count",
        ]),
      );
      const first = isolatedWp(["eval-file", script, "--user=test_admin"]);
      const second = isolatedWp(["eval-file", script, "--user=test_admin"]);
      assert.equal(second, first);
      assert.match(first, /\/app\/sites\/[1-9][0-9]*\/preview/);
      const after = Number(
        isolatedWp([
          "post",
          "list",
          "--post_type=ms_site",
          "--author=1",
          "--format=count",
        ]),
      );
      assert.equal(after, before + 1);
    },
  );

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: origin });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const artifactDirectory = join(pluginDirectory, "app/test-results/birthday");
  mkdirSync(artifactDirectory, { recursive: true });
  let path;
  let projectId;
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));

  try {
    await check(
      "birthday browser creates from catalog and does not fetch animation code on login/list/editor",
      async () => {
        await page.goto("/app/login");
        await page.getByLabel("Email address").fill("a@example.invalid");
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await expect(page).toHaveURL(/\/app\/sites$/);
        await page
          .getByRole("link", { name: "Create a site", exact: true })
          .first()
          .click();
        await page.getByLabel("Site type").selectOption("birthday-invitation");
        await expect(page.getByLabel("Template")).toHaveValue("birthday-party");
        await page.getByLabel("Project name").fill("Browser birthday");
        await page
          .getByRole("button", { name: "Create project", exact: true })
          .click();
        await expect(page.getByLabel("Celebrant name")).toBeVisible();
        path = new URL(page.url()).pathname;
        projectId = Number(path.split("/").at(-1));
        assert.equal(
          requests.some((url) => url.includes("BirthdayParty-")),
          false,
        );
        await page.getByLabel("Celebrant name").fill("Alex Morgan");
        await page.getByLabel("Age (optional)").fill("30");
        await page
          .getByLabel("Invitation heading")
          .fill("Good people. Great night.");
        await page
          .getByLabel("Invitation message")
          .fill(
            "A little older. A lot more to celebrate. Join me for a night with my favourite people.",
          );
        await page.getByLabel("Local date and time").fill("2027-07-10T19:30");
        await page.getByLabel("Time zone").fill("Europe/London");
        await page.getByLabel("Venue name").fill("The Loft");
        await page
          .getByLabel("Address", { exact: true })
          .fill("London\nUnited Kingdom");
        await page
          .getByLabel("Dress code (optional)")
          .fill("A little colour. A little sparkle.");
        await page
          .getByLabel("Additional information (optional)")
          .fill("Bring your best stories. We’ll take care of the rest.");
        await page
          .getByRole("button", { name: "Save changes", exact: true })
          .click();
        await expect(
          page.getByText("Changes saved.", { exact: true }),
        ).toBeVisible();
        await page.reload();
        await expect(page.getByLabel("Celebrant name")).toHaveValue(
          "Alex Morgan",
        );
        await expect(page.getByLabel("Local date and time")).toHaveValue(
          "2027-07-10T19:30",
        );
        await expect(page.getByLabel("Time zone")).toHaveValue("Europe/London");
        await expect(page.getByLabel("Address", { exact: true })).toHaveValue("London\nUnited Kingdom");
      },
    );

    await check(
      "birthday Preview explains unsaved data; cancellation and failed save never open a stale preview",
      async () => {
        await page.getByLabel("Invitation heading").fill("<b>Invalid</b>");
        await page
          .getByRole("button", { name: "Preview invitation", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Save before preview" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await page
          .getByRole("button", { name: "Preview invitation", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Save and preview", exact: true })
          .click();
        await expect(page.getByRole("alert")).toBeInViewport();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await page
          .getByLabel("Invitation heading")
          .fill("One unforgettable night.");
        await page
          .getByRole("button", { name: "Save and preview", exact: true })
          .click();
        await expect(page).toHaveURL(new RegExp(`${path}/preview$`));
        await expect(
          page.getByRole("button", { name: "Open invitation", exact: true }),
        ).toBeVisible();
        assert.equal(new URL(page.url()).search, "");
      },
    );

    await check(
      "birthday intro supports keyboard open, focus, single confetti and persistent details shortcut",
      async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.screenshot({
          path: join(artifactDirectory, "party-intro-1440.png"),
          fullPage: true,
          animations: "disabled",
        });
        await page
          .getByRole("button", { name: "Open invitation", exact: true })
          .focus();
        await page.keyboard.press("Enter");
        await expect(
          page.getByRole("heading", { name: "Alex Morgan", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Alex Morgan", exact: true }),
        ).toBeFocused();
        await expect(page.locator(".party-confetti-piece")).toHaveCount(42);
        await page.getByRole("link", { name: "Jump to details" }).click();
        await expect(page.locator("#party-details")).toBeInViewport();
        await expect(page.locator(".party-date")).toContainText("10 July 2027");
        await expect(page.locator(".party-date")).toContainText("19:30");
        await expect(page.getByText("The Loft", { exact: true })).toBeVisible();
        assert.equal(
          await page.evaluate(() => document.body.style.overflow),
          "",
        );
      },
    );

    await check(
      "birthday preview supports refresh, skip intro, placeholders and owner isolation",
      async () => {
        await page.reload();
        await page
          .getByRole("button", { name: "Skip intro", exact: true })
          .click();
        await expect(page.locator(".party-confetti-piece")).toHaveCount(0);
        await page
          .getByRole("link", { name: "Back to editor", exact: true })
          .click();
        await expect(page.getByLabel("Celebrant name")).toHaveValue(
          "Alex Morgan",
        );
        const denied = await b.context.get(`/app/sites/${projectId}/preview`);
        assert.equal(denied.status(), 404);
        await api(b, "GET", `/sites/${projectId}/preview`, undefined, 404);
      },
    );

    await check(
      "birthday screenshot review: three viewports and palettes, reduced motion, incomplete and maximum text",
      async () => {
        const still = await browser.newContext({
          baseURL: origin,
          storageState: await context.storageState(),
          reducedMotion: "reduce",
        });
        try {
          const review = await still.newPage();
          for (const [width, height, palette] of [
            [375, 812, "electric-citrus"],
            [768, 1024, "pink-noir"],
            [1440, 900, "cobalt-pop"],
          ]) {
            const read = await api(a, "GET", `/sites/${projectId}`);
            const draft = read.data.draft;
            draft.appearance.palette = palette;
            await api(a, "PATCH", `/sites/${projectId}`, { draft });
            await review.setViewportSize({ width, height });
            await review.goto(`${path}/preview`);
            await expect(
              review.getByRole("heading", { name: "Alex Morgan", exact: true }),
            ).toBeVisible();
            await expect(
              review.getByRole("button", {
                name: "Open invitation",
                exact: true,
              }),
            ).toHaveCount(0);
            await expect(review.locator(".party-confetti-piece")).toHaveCount(
              0,
            );
            assert.equal(
              await review.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
              ),
              false,
            );
            await review.screenshot({
              path: join(artifactDirectory, `party-${width}-${palette}.png`),
              fullPage: true,
              animations: "disabled",
            });
          }
          const maximum = structuredClone(defaultDraft);
          maximum.content.celebrantName = "Alexandria ".repeat(8).slice(0, 80);
          maximum.content.heading =
            "One unforgettable celebration with all the people who make life extraordinary. "
              .repeat(2)
              .slice(0, 120);
          maximum.content.message =
            "Every year brings more stories, more laughter and more reasons to get together. "
              .repeat(9)
              .slice(0, 600);
          maximum.content.additionalInfo =
            "Bring your best stories and a little birthday magic. "
              .repeat(12)
              .slice(0, 500);
          await api(a, "PATCH", `/sites/${projectId}`, { draft: maximum });
          await review.setViewportSize({ width: 375, height: 812 });
          await review.goto(`${path}/preview`);
          await expect(
            review.getByText("Date to be announced", { exact: true }),
          ).toBeVisible();
          await expect(review.locator(".party-age")).toHaveCount(0);
          await expect(
            review.getByText("The dress code", { exact: true }),
          ).toHaveCount(0);
          await expect(
            review.getByRole("link", { name: "Find the party" }),
          ).toHaveCount(0);
          assert.equal(
            await review.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          await review.screenshot({
            path: join(artifactDirectory, "party-375-maximum-text.png"),
            fullPage: true,
            animations: "disabled",
          });
        } finally {
          await still.close();
        }
      },
    );
    assert.deepEqual(errors, []);
    console.log(`Birthday screenshots: ${artifactDirectory}`);
  } finally {
    await browser.close();
  }
}
