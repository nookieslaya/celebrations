import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { randomBytes } from "node:crypto";
import {
  chromium,
  expect,
} from "../app/node_modules/@playwright/test/index.mjs";

/** Real WordPress behind a local hosting-style gate. This tests HTTP auth, not TLS. */
export async function runStagingTests({ origin, api, a, check, isolatedWp }) {
  await check(
    "staging hosting gate: real public RSVP and management work behind same-origin HTTP authentication",
    async () => {
      const catalog = (await api(null, "GET", "/catalog")).data;
      const template = catalog.templates.find(
        (item) => item.id === "birthday-celebration",
      );
      const draft = structuredClone(template.demoDraft);
      draft.content.rsvp.enabled = true;
      const site = (
        await api(
          a,
          "POST",
          "/sites",
          {
            name: "Synthetic staging gateway test",
            siteType: "birthday-invitation",
            templateId: template.id,
            draft,
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
      await api(a, "POST", `/sites/${site.id}/publish`);
      const originalHome = isolatedWp(["config", "get", "WP_HOME"]);
      const originalSite = isolatedWp(["config", "get", "WP_SITEURL"]);
      const credentials = {
        username: "staging-audit",
        password: randomBytes(24).toString("hex"),
      };
      const authorization = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`;
      const proxy = createServer((incoming, outgoing) => {
        if (incoming.headers.authorization !== authorization) {
          outgoing.writeHead(401, {
            "WWW-Authenticate": 'Basic realm="Staging audit"',
            "Cache-Control": "no-store",
          });
          outgoing.end("Access required.");
          return;
        }
        // The hosting gate terminates its own authentication, not WordPress accounts.
        const headers = { ...incoming.headers };
        delete headers.authorization;
        const forwarded = httpRequest(
          new URL(incoming.url, origin),
          { method: incoming.method, headers },
          (response) => {
            outgoing.writeHead(response.statusCode, response.headers);
            response.pipe(outgoing);
          },
        );
        forwarded.on("error", () => {
          outgoing.writeHead(502);
          outgoing.end();
        });
        incoming.pipe(forwarded);
      });
      await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
      const gateOrigin = `http://127.0.0.1:${proxy.address().port}`;
      const browser = await chromium.launch();
      let context;
      try {
        isolatedWp(["config", "set", "WP_HOME", gateOrigin, "--type=constant"]);
        isolatedWp([
          "config",
          "set",
          "WP_SITEURL",
          gateOrigin,
          "--type=constant",
        ]);
        context = await browser.newContext({
          httpCredentials: credentials,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${gateOrigin}/s/${site.publicId}/`);
        await page
          .getByLabel("Your name", { exact: true })
          .fill("Synthetic gated guest");
        await page
          .getByRole("button", { name: "Send RSVP", exact: true })
          .click();
        await expect(
          page.getByText("Your response is saved.", { exact: true }),
        ).toBeVisible();
        const management = await page
          .getByLabel("Your private management link")
          .inputValue();
        assert.equal(new URL(management).origin, gateOrigin);
        await page.goto(management);
        await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
          "Synthetic gated guest",
        );
        assert.deepEqual(errors, []);
      } finally {
        if (context) {
          await context.close();
        }
        await browser.close();
        isolatedWp([
          "config",
          "set",
          "WP_HOME",
          originalHome,
          "--type=constant",
        ]);
        isolatedWp([
          "config",
          "set",
          "WP_SITEURL",
          originalSite,
          "--type=constant",
        ]);
        await new Promise((resolve) => {
          proxy.close(resolve);
          proxy.closeAllConnections();
        });
      }
      assert.equal(
        (await api(a, "GET", `/sites/${site.id}/responses`)).data.pagination
          .total,
        1,
      );
    },
  );
}
