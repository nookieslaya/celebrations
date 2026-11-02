import { chooseTemplate, goStep } from "./editor-navigation.mjs";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  chromium,
  expect,
} from "../app/node_modules/@playwright/test/index.mjs";
import jsQR from "../app/node_modules/jsqr/dist/jsQR.js";

export async function runPublicationTests({
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
  let publicUrl;
  const browser = await chromium.launch();
  const anonymous = await browser.newContext({ reducedMotion: "reduce" });
  const owner = await browser.newContext({ baseURL: origin });
  const page = await owner.newPage();
  const publicPage = await anonymous.newPage();
  const artifactDirectory = join(
    pluginDirectory,
    "app/test-results/publication",
  );
  mkdirSync(artifactDirectory, { recursive: true });
  const grant = (id, value = "grant") =>
    isolatedWp([
      "microsite",
      "publication-right",
      String(id),
      value,
      "--user=test_admin",
    ]);
  async function readLive(url = publicUrl, status = 200) {
    const response = await anonymous.request.get(url);
    assert.equal(response.status(), status);
    assert.match(response.headers()["cache-control"], /no-store/);
    assert.match(response.headers()["x-robots-tag"], /noindex/);
    return response.text();
  }
  try {
    await check(
      "publication entitlement defaults denied and cannot be escalated through REST",
      async () => {
        site = (
          await api(
            a,
            "POST",
            "/sites",
            {
              name: "Private account project marker",
              siteType: "birthday-invitation",
              templateId: "birthday-party",
            },
            201,
          )
        ).data;
        assert.equal(site.publication.canPublish, false);
        assert.equal(
          site.publication.blockedCode,
          "microsite_publication_locked",
        );
        publicUrl = site.publication.publicUrl;
        await readLive(publicUrl, 404);
        await api(a, "POST", `/sites/${site.id}/publish`, undefined, 403);
        for (const payload of [
          { publication: { entitled: true } },
          { publicationRight: true },
          { paid: true },
        ]) {
          await api(a, "PATCH", `/sites/${site.id}`, payload, 400);
        }
        await api(
          a,
          "POST",
          `/sites/${site.id}/publish`,
          { granted: true },
          400,
        );
        await api(null, "POST", `/sites/${site.id}/publish`, undefined, 401);
        await api(
          a,
          "POST",
          `/sites/${site.id}/publish`,
          undefined,
          403,
          "invalid",
        );
        assert.throws(() =>
          isolatedWp([
            "microsite",
            "publication-right",
            String(site.id),
            "grant",
            "--user=client_a",
          ]),
        );
        grant(site.id);
        const incomplete = await api(
          a,
          "POST",
          `/sites/${site.id}/publish`,
          undefined,
          422,
        );
        assert.ok(incomplete.data.fields["content.celebrantName"]);
        assert.ok(incomplete.data.fields["content.event.localDateTime"]);
        const whitespace = structuredClone(site.draft);
        whitespace.content.celebrantName = "\u00a0  ";
        site = (
          await api(a, "PATCH", `/sites/${site.id}`, { draft: whitespace })
        ).data;
        assert.equal(
          site.draft.content.celebrantName,
          whitespace.content.celebrantName,
        );
        await api(a, "POST", `/sites/${site.id}/publish`, undefined, 422);
        await api(b, "POST", `/sites/${site.id}/publish`, undefined, 404);
        await api(b, "POST", `/sites/${site.id}/unpublish`, undefined, 404);
      },
    );

    await check(
      "publication browser creates, saves, grants and publishes a birthday page",
      async () => {
        await page.goto("/app/login");
        await page.getByLabel("Email address").fill("a@example.invalid");
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await expect(page).toHaveURL(/\/app\/sites\/?$/);
        await page.goto("/app/sites/new");
        await chooseTemplate(page, "birthday-invitation", "Birthday Party");
        await page
          .getByLabel("Project name")
          .fill("Browser publication private name");
        await page.getByRole("button", { name: "Create project" }).click();
        await expect(page.getByLabel("Celebrant name")).toBeVisible();
        const id = Number(
          new URL(page.url()).pathname.match(/sites\/(\d+)/)[1],
        );
        await goStep(page, "about");
        await page.getByLabel("Celebrant name").fill("Publication Alex");
        await goStep(page, "about");
        await page
          .getByLabel("Invitation heading")
          .fill("Published birthday heading");
        await goStep(page, "about");
        await page
          .getByLabel("Invitation message")
          .fill("Only this published message is public.");
        await goStep(page, "event");
        await page.getByLabel("Local date and time").fill("2027-07-10T19:30");
        await goStep(page, "event");
        await page.getByLabel("Time zone").fill("Europe/London");
        await goStep(page, "event");
        await page.getByLabel("Venue name").fill("Publication Loft");
        await goStep(page, "event");
        await page
          .getByLabel("Address", { exact: true })
          .fill("London\nUnited Kingdom");
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          page.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        grant(id);
        await page.reload();
        await goStep(page, "review");
        await page
          .getByRole("button", { name: "Publish", exact: true })
          .click();
        await expect(
          page.getByRole("link", { name: "View live page" }),
        ).toBeVisible();
        site = (await api(a, "GET", `/sites/${id}`)).data;
        publicUrl = site.publication.publicUrl;
        assert.equal(site.publication.published, true);
        assert.equal(site.publication.hasUnpublishedChanges, false);
        await expect(
          page.getByText(
            "Local preview — this link and QR are not publicly accessible.",
          ),
        ).toBeVisible();
      },
    );

    await check(
      "anonymous public snapshot has metadata, no account/draft/bootstrap, and no Vite or private API",
      async () => {
        const html = await readLive();
        assert.match(html, /Published birthday heading/);
        assert.doesNotMatch(
          html,
          /Browser publication private name|a@example.invalid|authCsrfToken|restUrl|X-WP-Nonce|nonce|5173|src\/main.tsx/,
        );
        assert.match(html, /rel="canonical"/);
        assert.match(html, /property="og:title"/);
        assert.doesNotMatch(html, /og:image/);
        const requests = [];
        publicPage.on("request", (request) => requests.push(request.url()));
        await publicPage.goto(publicUrl);
        await expect(
          publicPage.getByText("Only this published message is public."),
        ).toBeVisible();
        assert.equal((await anonymous.cookies()).length, 0);
        assert.equal(
          requests.some((url) =>
            /microsites\/v1|5173|\/assets\/app-|\/src\/|auth\/login/.test(url),
          ),
          false,
        );
        await publicPage.reload();
        await expect(
          publicPage.getByText("Publication Loft", { exact: true }),
        ).toBeVisible();
        const snapshot = JSON.parse(
          html.match(/id="microsite-public"[^>]*>([^<]+)</)[1],
        );
        assert.deepEqual(Object.keys(snapshot).sort(), [
          "appearance",
          "content",
          "schemaVersion",
          "siteType",
          "templateId",
          "templateVersion",
        ]);
        assert.equal(snapshot.content.event.startsAt, "2027-07-10T18:30:00Z");
        const repeated = (await api(a, "POST", `/sites/${site.id}/publish`))
          .data;
        assert.equal(
          repeated.publication.lastPublishedAt,
          site.publication.lastPublishedAt,
        );
        assert.equal(repeated.publication.publicUrl, publicUrl);
      },
    );

    await check(
      "draft edits remain private; failed save never publishes; dirty publish can cancel or save and publish",
      async () => {
        await goStep(page, "about");
        await page
          .getByLabel("Invitation message")
          .fill("Secret unsaved message");
        await goStep(page, "review");
        await page
          .getByRole("button", { name: "Update live page", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Save before publishing" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        assert.doesNotMatch(await readLive(), /Secret unsaved message/);
        await goStep(page, "about");
        await page.getByLabel("Invitation heading").fill("<b>invalid</b>");
        let publishRequests = 0;
        const watch = (request) => {
          if (request.url().endsWith(`/sites/${site.id}/publish`))
            publishRequests++;
        };
        page.on("request", watch);
        await goStep(page, "review");
        await page
          .getByRole("button", { name: "Update live page", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Save and publish", exact: true })
          .click();
        await expect(
          page
            .getByRole("region", { name: "Publication", exact: true })
            .getByRole("alert"),
        ).toBeVisible();
        assert.equal(publishRequests, 0);
        assert.doesNotMatch(await readLive(), /Secret unsaved message/);
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await goStep(page, "about");
        await page
          .getByLabel("Invitation heading")
          .fill("Published birthday heading");
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          page.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        await goStep(page, "review");
        await expect(
          page.getByText("Unpublished changes", { exact: true }),
        ).toBeVisible();
        assert.doesNotMatch(await readLive(), /Secret unsaved message/);
        await goStep(page, "review");
        await page
          .getByRole("button", { name: "Update live page", exact: true })
          .click();
        await expect(
          page.getByText("Your live page is up to date.", { exact: true }),
        ).toBeVisible();
        assert.match(await readLive(), /Secret unsaved message/);
        await goStep(page, "about");
        await page
          .getByLabel("Invitation message")
          .fill("Saved and published together");
        await goStep(page, "review");
        await page
          .getByRole("button", { name: "Update live page", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Save and publish", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        assert.match(await readLive(), /Saved and published together/);
        page.off("request", watch);
        const updated = (await api(a, "GET", `/sites/${site.id}`)).data;
        assert.equal(updated.publicId, site.publicId);
        assert.equal(updated.publication.publicUrl, publicUrl);
        assert.equal(updated.publication.hasUnpublishedChanges, false);
      },
    );

    await check(
      "QR downloads SVG and PNG decode to the exact backend URL; publication layout fits desktop and mobile",
      async () => {
        for (const format of ["SVG", "PNG"]) {
          const downloadEvent = page.waitForEvent("download");
          await page
            .getByRole("button", { name: `Download QR ${format}` })
            .click();
          const download = await downloadEvent;
          const file = join(
            artifactDirectory,
            `publication.${format.toLowerCase()}`,
          );
          await download.saveAs(file);
          const dataUrl = `data:image/${format === "SVG" ? "svg+xml" : "png"};base64,${readFileSync(file).toString("base64")}`;
          const pixels = await page.evaluate(async (src) => {
            const image = new Image();
            image.src = src;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext("2d");
            context.fillStyle = "white";
            context.fillRect(0, 0, 512, 512);
            context.drawImage(image, 0, 0, 512, 512);
            return Array.from(context.getImageData(0, 0, 512, 512).data);
          }, dataUrl);
          assert.equal(
            jsQR(new Uint8ClampedArray(pixels), 512, 512)?.data,
            publicUrl,
          );
        }
        await page
          .getByRole("button", { name: "Copy link", exact: true })
          .click();
        await expect(
          page.getByText("Link copied.", { exact: true }),
        ).toBeVisible();
        for (const width of [1440, 375]) {
          await page.setViewportSize({ width, height: 900 });
          const panel = page.getByRole("region", {
            name: "Publication",
            exact: true,
          });
          await panel.scrollIntoViewIfNeeded();
          await panel.screenshot({
            path: join(artifactDirectory, `publication-${width}.png`),
          });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
            true,
          );
        }
      },
    );

    await check(
      "revocation leaves live page intact, blocks updates, preserves draft save and owner withdrawal",
      async () => {
        grant(site.id, "revoke");
        await api(a, "POST", `/sites/${site.id}/publish`, undefined, 403);
        await api(a, "PATCH", `/sites/${site.id}`, {
          name: "Renamed private project",
        });
        await readLive();
        await page.reload();
        await expect(
          page.getByRole("button", { name: "Update live page", exact: true }),
        ).toBeDisabled();
        await goStep(page, "review");
        await page
          .getByRole("button", { name: "Unpublish", exact: true })
          .click();
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await readLive();
        await goStep(page, "review");
        await page
          .getByRole("button", { name: "Unpublish", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Confirm unpublish", exact: true })
          .click();
        await expect(
          page.getByRole("link", { name: "View live page" }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Download QR SVG" }),
        ).toHaveCount(0);
        await readLive(publicUrl, 404);
        grant(site.id);
        const republished = (await api(a, "POST", `/sites/${site.id}/publish`))
          .data;
        assert.equal(republished.publication.publicUrl, publicUrl);
        await readLive();
      },
    );

    await check(
      "publication lock rejects concurrent commands and failed writes preserve the complete previous snapshot",
      async () => {
        const current = (await api(a, "GET", `/sites/${site.id}`)).data;
        const changed = structuredClone(current.draft);
        changed.content.message = "Never visible after failed publication";
        await api(a, "PATCH", `/sites/${site.id}`, { draft: changed });
        const result = JSON.parse(
          isolatedWp([
            "eval",
            `
        $id = ${site.id};
        $repository = new \\Microsite\\Core\\SiteRepository();
        $service = new \\Microsite\\Core\\Publication($repository, new \\Microsite\\Core\\SiteValidator(new \\Microsite\\Core\\Catalog()), new \\Microsite\\Core\\Permissions());
        global $wpdb;
        $other = new \\wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST);
        $key = 'microsite:' . substr(hash('sha256', DB_NAME . ':' . $wpdb->prefix . ':' . $id), 0, 48);
        $other->get_var($other->prepare('SELECT GET_LOCK(%s, 0)', $key));
        try {
            $busy = $service->publish($id);
        } finally {
            $other->get_var($other->prepare('SELECT RELEASE_LOCK(%s)', $key));
        }
        $before = get_post_meta($id, '_microsite_publication', true);
        add_filter('update_post_metadata', function($value, $object_id, $meta_key) {
            if ('_microsite_publication' === $meta_key) {
                return false;
            }
            return $value;
        }, 10, 3);
        $failed = $service->publish($id);
        $after = get_post_meta($id, '_microsite_publication', true);
        echo wp_json_encode(array('busy' => $busy->get_error_code(), 'failed' => $failed->get_error_code(), 'unchanged' => $before === $after));
      `,
            "--user=client_a",
          ]),
        );
        assert.equal(result.busy, "microsite_publication_busy");
        assert.equal(result.failed, "microsite_storage_error");
        assert.equal(result.unchanged, true);
        assert.doesNotMatch(
          await readLive(),
          /Never visible after failed publication/,
        );
        await api(a, "POST", `/sites/${site.id}/publish`);
        assert.match(
          await readLive(),
          /Never visible after failed publication/,
        );
      },
    );

    await check(
      "basic-page uses the shared public renderer and random or draft links return 404",
      async () => {
        const basic = (
          await api(
            a,
            "POST",
            "/sites",
            {
              name: "Private basic title",
              siteType: "basic-page",
              templateId: "basic",
              draft: {
                content: {
                  heading: "Public basic page",
                  description: "Public basic description",
                },
                appearance: { accent: "sage" },
              },
            },
            201,
          )
        ).data;
        await readLive(basic.publication.publicUrl, 404);
        grant(basic.id);
        await api(a, "POST", `/sites/${basic.id}/publish`);
        await publicPage.goto(basic.publication.publicUrl);
        await expect(
          publicPage.getByRole("heading", { name: "Public basic page" }),
        ).toBeVisible();
        await expect(
          publicPage.getByText("Public basic description", { exact: true }),
        ).toBeVisible();
        await readLive(`${origin}/s/00000000000000000000000000000000/`, 404);
        await readLive(`${origin}/s/not-a-public-id/`, 404);
      },
    );
  } finally {
    await browser.close();
  }
}
