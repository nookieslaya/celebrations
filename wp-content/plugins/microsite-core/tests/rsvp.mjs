import { chooseTemplate, goStep } from "./editor-navigation.mjs";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  chromium,
  expect,
  request,
} from "../app/node_modules/@playwright/test/index.mjs";

export async function runRsvpTests({
  origin,
  api,
  a,
  b,
  check,
  password,
  pluginDirectory,
  isolatedWp,
}) {
  const anonymous = await request.newContext({ baseURL: origin });
  let site;
  let credentials;
  let response;
  const clock = Math.floor(Date.now() / 1000);
  const identity = (now = clock) => ({
    secret: randomBytes(32).toString("hex"),
    key: `${now}.${randomBytes(32).toString("hex")}`,
  });
  const answer = {
    name: "Łucja O'Neill-Kowalska",
    attending: "yes",
    partySize: 3,
    website: "",
  };
  const path = () => `/public/sites/${site.publicId}/responses`;
  const management = (id = response.id) => `/rsvp/responses/${id}`;
  const resetRate = () =>
    isolatedWp([
      "eval",
      `global $wpdb; $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient%microsite_rsvp_rate_%'");`,
    ]);
  const setClock = (now) =>
    isolatedWp(["option", "update", "microsite_test_rsvp_now", String(now)]);
  const grant = (id) =>
    isolatedWp([
      "microsite",
      "publication-right",
      String(id),
      "grant",
      "--user=test_admin",
    ]);
  async function guest(
    method,
    route,
    payload,
    identityValue = credentials,
    expected = 200,
    extra = {},
  ) {
    const headers = { Origin: origin, ...extra };
    if (identityValue?.secret)
      headers["X-Microsite-RSVP"] = identityValue.secret;
    if (identityValue?.key) headers["Idempotency-Key"] = identityValue.key;
    const result = await anonymous.fetch(
      `/index.php?rest_route=/microsites/v1${route}`,
      { method, headers, data: payload },
    );
    const body = await result.json();
    assert.equal(
      result.status(),
      expected,
      `${method} ${route}: ${JSON.stringify(body)}`,
    );
    assert.match(result.headers()["cache-control"], /no-store/);
    return body;
  }
  async function publishDraft(draft) {
    site = (await api(a, "PATCH", `/sites/${site.id}`, { draft })).data;
    return (await api(a, "POST", `/sites/${site.id}/publish`)).data;
  }
  try {
    await check(
      "RSVP additive schema preserves old drafts/snapshots and migrations are idempotent",
      async () => {
        setClock(clock);
        resetRate();
        site = (
          await api(
            a,
            "POST",
            "/sites",
            {
              name: "RSVP HTTP invitation",
              siteType: "birthday-invitation",
              templateId: "birthday-party",
            },
            201,
          )
        ).data;
        const oldDraft = structuredClone(site.draft);
        delete oldDraft.content.rsvp;
        Object.assign(oldDraft.content, {
          celebrantName: "Host",
          venueName: "Venue",
          address: "London",
          event: {
            localDateTime: "2030-07-10T19:30",
            timeZone: "Europe/London",
            startsAt: "",
          },
        });
        site = (await api(a, "PATCH", `/sites/${site.id}`, { draft: oldDraft }))
          .data;
        assert.equal(site.draft.content.rsvp, undefined);
        grant(site.id);
        await api(a, "POST", `/sites/${site.id}/publish`);
        const disabled = (
          await guest("GET", `/public/sites/${site.publicId}/rsvp`)
        ).data;
        assert.equal(disabled.enabled, false);
        const live = await anonymous.get(site.publication.publicUrl);
        const html = await live.text();
        assert.doesNotMatch(html, /id="microsite-rsvp"/);
        const snapshotBefore = isolatedWp([
          "eval",
          `echo wp_json_encode(get_post_meta(${site.id}, '_microsite_publication', true));`,
        ]);
        isolatedWp(["option", "delete", "microsite_rsvp_database_version"]);
        isolatedWp([
          "eval",
          "Microsite\\Core\\RsvpDatabase::install(); Microsite\\Core\\RsvpDatabase::install();",
        ]);
        assert.equal(
          isolatedWp([
            "eval",
            `echo wp_json_encode(get_post_meta(${site.id}, '_microsite_publication', true));`,
          ]),
          snapshotBefore,
        );
        assert.equal(
          isolatedWp(["option", "get", "microsite_rsvp_database_version"]),
          "1",
        );
        const catalog = (await api(null, "GET", "/catalog")).data;
        assert.ok(
          catalog.siteTypes
            .find((type) => type.id === "birthday-invitation")
            .features.includes("rsvp"),
        );
        assert.equal(
          catalog.siteTypes
            .find((type) => type.id === "basic-page")
            .features.includes("rsvp"),
          false,
        );
        const basic = (
          await api(
            a,
            "POST",
            "/sites",
            {
              name: "Basic no RSVP",
              siteType: "basic-page",
              templateId: "basic",
            },
            201,
          )
        ).data;
        await api(a, "GET", `/sites/${basic.id}/responses`, undefined, 400);
        const invalid = structuredClone(basic.draft);
        invalid.content.rsvp = { enabled: true };
        await api(a, "PATCH", `/sites/${basic.id}`, { draft: invalid }, 400);
      },
    );

    await check(
      "RSVP settings validate integer limits, DST, canonical UTC and event/deadline dependencies",
      async () => {
        const draft = structuredClone(site.draft);
        draft.content.rsvp = {
          enabled: true,
          maxPartySize: 5,
          deadlineLocal: "2030-07-09T19:30",
          deadlineAt: "",
        };
        for (const limit of [0, -1, 21, 1.5, "3"]) {
          const invalid = structuredClone(draft);
          invalid.content.rsvp.maxPartySize = limit;
          await api(a, "PATCH", `/sites/${site.id}`, { draft: invalid }, 400);
        }
        for (const deadline of [
          "2030-07-11T19:30",
          "2027-03-28T01:30",
          "2027-10-31T01:30",
        ]) {
          const invalid = structuredClone(draft);
          invalid.content.rsvp.deadlineLocal = deadline;
          const result = await api(
            a,
            "PATCH",
            `/sites/${site.id}`,
            { draft: invalid },
            400,
          );
          assert.ok(result.data.fields["content.rsvp.deadlineLocal"]);
        }
        site = (await api(a, "PATCH", `/sites/${site.id}`, { draft })).data;
        assert.equal(
          site.draft.content.rsvp.deadlineAt,
          "2030-07-09T18:30:00Z",
        );
        assert.equal(
          (await guest("GET", `/public/sites/${site.publicId}/rsvp`)).data
            .enabled,
          false,
        );
        const earlier = structuredClone(site.draft);
        earlier.content.event.localDateTime = "2030-07-08T19:30";
        await api(a, "PATCH", `/sites/${site.id}`, { draft: earlier }, 400);
        await api(a, "POST", `/sites/${site.id}/publish`);
        assert.equal(
          (await guest("GET", `/public/sites/${site.publicId}/rsvp`)).data.open,
          true,
        );
      },
    );

    await check(
      "RSVP validates yes/no, Unicode names, size, JSON, origin, payload size and honeypot",
      async () => {
        resetRate();
        for (const invalid of [
          { ...answer, name: "\u00a0 " },
          { ...answer, name: "<b>Guest</b>" },
          { ...answer, name: "&lt;b&gt;" },
          { ...answer, name: "x".repeat(81) },
          { ...answer, attending: "maybe" },
          { ...answer, partySize: "3" },
          { ...answer, partySize: 0 },
          { ...answer, partySize: 6 },
          { ...answer, partySize: 1.5 },
          { ...answer, attending: "no", partySize: 1 },
        ]) {
          await guest("POST", path(), invalid, identity(), 422);
        }
        await guest(
          "POST",
          path(),
          { ...answer, website: "bot.example" },
          identity(),
          400,
        );
        await guest(
          "POST",
          path(),
          { ...answer, email: "not-collected@example.invalid" },
          identity(),
          400,
        );
        await guest(
          "POST",
          path(),
          { ...answer, name: "x".repeat(3000) },
          identity(),
          413,
        );
        await guest("POST", path(), answer, identity(), 403, {
          Origin: "https://foreign.invalid",
        });
        const missingOrigin = await anonymous.post(
          `/index.php?rest_route=/microsites/v1${path()}`,
          { data: answer },
        );
        assert.equal(missingOrigin.status(), 403);
        const cors = await anonymous.fetch(
          `/index.php?rest_route=/microsites/v1${path()}`,
          {
            method: "OPTIONS",
            headers: {
              Origin: "https://foreign.invalid",
              "Access-Control-Request-Method": "POST",
            },
          },
        );
        assert.equal(cors.headers()["access-control-allow-origin"], undefined);
        credentials = identity();
        response = (await guest("POST", path(), answer, credentials, 201)).data
          .response;
        assert.equal(response.name, answer.name);
        assert.deepEqual(Object.keys(response).sort(), [
          "attending",
          "createdAt",
          "id",
          "name",
          "partySize",
          "updatedAt",
        ]);
        const stored = JSON.parse(
          isolatedWp([
            "eval",
            `global $wpdb; echo wp_json_encode($wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}microsite_rsvp WHERE id = %d", ${response.id}), ARRAY_A));`,
          ]),
        );
        assert.equal(stored.secret_hash.length, 64);
        assert.notEqual(stored.secret_hash, credentials.secret);
        assert.equal(
          JSON.stringify(stored).includes(credentials.secret),
          false,
        );
        assert.equal(stored.ip, undefined);
      },
    );

    await check(
      "RSVP retry is idempotent across concurrent HTTP requests and later edits; conflicting payload/secret is rejected",
      async () => {
        resetRate();
        const same = await Promise.all(
          Array.from({ length: 6 }, () =>
            guest("POST", path(), answer, credentials),
          ),
        );
        assert.ok(
          same.every(
            (item) =>
              item.data.response.id === response.id && item.data.replayed,
          ),
        );
        await guest(
          "POST",
          path(),
          { ...answer, name: "Another" },
          credentials,
          409,
        );
        await guest(
          "POST",
          path(),
          answer,
          { ...credentials, secret: identity().secret },
          409,
        );
        await guest("PATCH", management(), {
          ...answer,
          attending: "no",
          partySize: 0,
        });
        const replay = (await guest("POST", path(), answer)).data;
        assert.equal(replay.response.id, response.id);
        assert.equal(replay.response.attending, "no");
        const newIdentity = identity();
        const parallel = await Promise.all(
          Array.from({ length: 5 }, async () => {
            const result = await anonymous.post(
              `/index.php?rest_route=/microsites/v1${path()}`,
              {
                headers: {
                  Origin: origin,
                  "X-Microsite-RSVP": newIdentity.secret,
                  "Idempotency-Key": newIdentity.key,
                },
                data: answer,
              },
            );
            assert.ok([200, 201, 409].includes(result.status()));
            return result.json();
          }),
        );
        const ids = parallel
          .filter((item) => item.data?.response)
          .map((item) => item.data.response.id);
        assert.ok(ids.length > 0);
        assert.equal(new Set(ids).size, 1);
        const recovered = (await guest("POST", path(), answer, newIdentity))
          .data.response;
        assert.equal(recovered.id, ids[0]);
        assert.equal(
          Number(
            isolatedWp([
              "eval",
              `global $wpdb; echo $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}microsite_rsvp WHERE project_id = ${site.id}");`,
            ]),
          ),
          2,
        );
        await guest("DELETE", management(recovered.id), undefined, newIdentity);
      },
    );

    await check(
      "secret access is isolated, owner A/B authorization is real, summaries cover all pages",
      async () => {
        resetRate();
        const own = (await guest("GET", management())).data;
        assert.equal(own.response.id, response.id);
        const bad = await guest(
          "GET",
          management(),
          undefined,
          identity(),
          404,
        );
        const missing = await guest(
          "GET",
          management(99999999),
          undefined,
          identity(),
          404,
        );
        assert.deepEqual(bad, missing);
        await api(b, "GET", `/sites/${site.id}/responses`, undefined, 404);
        await api(
          b,
          "DELETE",
          `/sites/${site.id}/responses/${response.id}`,
          undefined,
          404,
        );
        await api(null, "GET", `/sites/${site.id}/responses`, undefined, 401);
        await api(
          a,
          "GET",
          `/sites/${site.id}/responses`,
          undefined,
          403,
          "invalid",
        );
        const other = identity();
        const otherResponse = (
          await guest(
            "POST",
            path(),
            { ...answer, name: "Same event, separate person" },
            other,
            201,
          )
        ).data.response;
        await guest(
          "GET",
          management(otherResponse.id),
          undefined,
          credentials,
          404,
        );
        const list = (
          await api(
            a,
            "GET",
            `/sites/${site.id}/responses&per_page=1&attending=yes`,
          )
        ).data;
        assert.equal(list.items.length, 1);
        assert.equal(list.summary.yes, 1);
        assert.equal(list.summary.no, 1);
        assert.equal(list.summary.participants, 3);
        assert.doesNotMatch(
          JSON.stringify(list),
          /secret|creation_key|fingerprint|project_id/,
        );
        const unrelated = (
          await api(
            a,
            "POST",
            "/sites",
            {
              name: "Another birthday",
              siteType: "birthday-invitation",
              templateId: "birthday-party",
            },
            201,
          )
        ).data;
        await api(
          a,
          "DELETE",
          `/sites/${unrelated.id}/responses/${otherResponse.id}`,
          undefined,
          404,
        );
        await api(
          a,
          "GET",
          `/sites/${site.id}/responses&per_page=51`,
          undefined,
          400,
        );
        await api(
          a,
          "DELETE",
          `/sites/${site.id}/responses/${otherResponse.id}`,
        );
        await guest("GET", management(otherResponse.id), undefined, other, 404);
      },
    );

    await check(
      "live limits and exact deadline/event boundaries govern changes, never private draft settings",
      async () => {
        resetRate();
        await guest("PATCH", management(), answer);
        const smaller = structuredClone(site.draft);
        smaller.content.rsvp.maxPartySize = 1;
        site = (await api(a, "PATCH", `/sites/${site.id}`, { draft: smaller }))
          .data;
        assert.equal(
          (await guest("GET", `/public/sites/${site.publicId}/rsvp`)).data
            .maxPartySize,
          5,
        );
        await api(a, "POST", `/sites/${site.id}/publish`);
        assert.equal(
          (await guest("GET", management())).data.response.partySize,
          3,
        );
        await guest("PATCH", management(), answer, credentials, 422);
        await guest("PATCH", management(), {
          ...answer,
          attending: "no",
          partySize: 0,
        });
        const deadline = Date.parse(site.draft.content.rsvp.deadlineAt) / 1000;
        setClock(deadline - 1);
        assert.equal(
          (await guest("GET", `/public/sites/${site.publicId}/rsvp`)).data.open,
          true,
        );
        setClock(deadline);
        assert.equal(
          (await guest("GET", `/public/sites/${site.publicId}/rsvp`)).data.open,
          false,
        );
        await guest(
          "PATCH",
          management(),
          { ...answer, attending: "no", partySize: 0 },
          credentials,
          409,
        );
        await guest("POST", path(), answer, identity(deadline), 409);
        const replay = (await guest("POST", path(), answer)).data;
        assert.equal(replay.response.id, response.id);
        const noDeadline = structuredClone(site.draft);
        noDeadline.content.rsvp.deadlineLocal = "";
        await publishDraft(noDeadline);
        const starts = Date.parse(site.draft.content.event.startsAt) / 1000;
        setClock(starts - 1);
        assert.equal(
          (await guest("GET", `/public/sites/${site.publicId}/rsvp`)).data.open,
          true,
        );
        setClock(starts);
        assert.equal(
          (await guest("GET", `/public/sites/${site.publicId}/rsvp`)).data.open,
          false,
        );
        await guest("DELETE", management());
        await guest("GET", management(), undefined, credentials, 404);
        await guest("POST", path(), answer, credentials, 409);
        setClock(clock);
      },
    );

    await check(
      "disable/unpublish retain answers and private deletion; consumed and expired keys cannot resurrect data",
      async () => {
        resetRate();
        credentials = identity();
        response = (
          await guest(
            "POST",
            path(),
            { ...answer, partySize: 1 },
            credentials,
            201,
          )
        ).data.response;
        const disabled = structuredClone(site.draft);
        disabled.content.rsvp.enabled = false;
        await publishDraft(disabled);
        await guest(
          "POST",
          path(),
          { ...answer, partySize: 1 },
          identity(),
          409,
        );
        await guest(
          "PATCH",
          management(),
          { ...answer, attending: "no", partySize: 0 },
          credentials,
          409,
        );
        await api(a, "POST", `/sites/${site.id}/unpublish`);
        const shell = await anonymous.get("/rsvp/manage/");
        assert.equal(shell.status(), 200);
        assert.match(shell.headers()["referrer-policy"], /no-referrer/);
        assert.doesNotMatch(
          await shell.text(),
          /RSVP HTTP invitation|Łucja|secret_hash/,
        );
        assert.equal(
          (await guest("GET", management())).data.response.id,
          response.id,
        );
        await guest("DELETE", management());
        await guest(
          "POST",
          path(),
          { ...answer, partySize: 1 },
          credentials,
          409,
        );
        const enabled = structuredClone(site.draft);
        enabled.content.rsvp.enabled = true;
        await publishDraft(enabled);
        await guest(
          "POST",
          path(),
          { ...answer, partySize: 1 },
          credentials,
          409,
        );
        setClock(clock + 3 * 86400);
        isolatedWp([
          "eval",
          "global $wpdb; $wpdb->query('DELETE FROM ' . $wpdb->prefix . 'microsite_rsvp_deleted');",
        ]);
        await guest(
          "POST",
          path(),
          { ...answer, partySize: 1 },
          credentials,
          409,
        );
        setClock(clock);
        const preserved = identity();
        const row = (
          await guest(
            "POST",
            path(),
            { ...answer, partySize: 1 },
            preserved,
            201,
          )
        ).data.response;
        await api(a, "POST", `/sites/${site.id}/unpublish`);
        await api(a, "POST", `/sites/${site.id}/publish`);
        assert.equal(
          (await guest("GET", management(row.id), undefined, preserved)).data
            .response.id,
          row.id,
        );
        await guest("DELETE", management(row.id), undefined, preserved);
      },
    );

    await check(
      "anonymous rate limiting is bounded, ignores forwarded IP, and project deletion removes records/secrets",
      async () => {
        resetRate();
        const id = identity();
        const data = { ...answer, partySize: 1 };
        await guest("POST", path(), data, id, 201);
        for (let index = 1; index < 40; index++)
          await guest("POST", path(), data, id);
        const limited = await guest("POST", path(), data, id, 429, {
          "X-Forwarded-For": "203.0.113.88",
        });
        assert.ok(
          limited.data.retryAfter > 0 && limited.data.retryAfter <= 600,
        );
        resetRate();
        const row = (await guest("POST", path(), data, id)).data.response;
        isolatedWp(["post", "delete", String(site.id), "--force"]);
        await guest("GET", management(row.id), undefined, id, 404);
        assert.equal(
          Number(
            isolatedWp([
              "eval",
              `global $wpdb; echo $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}microsite_rsvp WHERE project_id = ${site.id}");`,
            ]),
          ),
          0,
        );
      },
    );

    await runRsvpBrowser({
      origin,
      api,
      a,
      check,
      password,
      pluginDirectory,
      isolatedWp,
      resetRate,
    });
  } finally {
    isolatedWp(["option", "delete", "microsite_test_rsvp_now"]);
    await anonymous.dispose();
  }
}

async function runRsvpBrowser({
  origin,
  api,
  a,
  check,
  password,
  pluginDirectory,
  isolatedWp,
  resetRate,
}) {
  const browser = await chromium.launch();
  const owner = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
  });
  const anonymous = await browser.newContext({
    baseURL: origin,
    reducedMotion: "reduce",
    viewport: { width: 375, height: 900 },
  });
  const organizer = await owner.newPage();
  const guest = await anonymous.newPage();
  const artifacts = join(pluginDirectory, "app/test-results/rsvp");
  mkdirSync(artifacts, { recursive: true });
  let id;
  let publicUrl;
  let privateLink;
  const requests = [];
  guest.on("request", (item) => requests.push(item.url()));
  try {
    await check(
      "RSVP browser organizer configures and publishes, preview never submits, anonymous guest safely retries lost HTTP response",
      async () => {
        resetRate();
        await organizer.goto("/app/login");
        await organizer.getByLabel("Email address").fill("a@example.invalid");
        await organizer.getByLabel("Password", { exact: true }).fill(password);
        await organizer
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await expect(organizer).toHaveURL(/\/app\/sites\/?$/);
        await organizer.goto("/app/sites/new");
        await chooseTemplate(
          organizer,
          "birthday-invitation",
          "Birthday Party",
        );
        await organizer.getByLabel("Project name").fill("Browser RSVP event");
        await organizer
          .getByRole("button", { name: "Create project", exact: true })
          .click();
        await expect(organizer.getByLabel("Celebrant name")).toBeVisible();
        id = Number(new URL(organizer.url()).pathname.match(/sites\/(\d+)/)[1]);
        await goStep(organizer, "about");
        await organizer.getByLabel("Celebrant name").fill("RSVP Host");
        await goStep(organizer, "event");
        await organizer
          .getByLabel("Local date and time")
          .fill("2030-07-10T19:30");
        await goStep(organizer, "event");
        await organizer.getByLabel("Venue name").fill("RSVP venue");
        await goStep(organizer, "event");
        await organizer.getByLabel("Address", { exact: true }).fill("London");
        await goStep(organizer, "responses");
        await organizer.getByLabel("Accept RSVP responses").check();
        await goStep(organizer, "responses");
        await organizer
          .getByLabel("Maximum people per response, including the guest")
          .fill("5");
        await goStep(organizer, "responses");
        await organizer
          .getByLabel("RSVP deadline (optional)")
          .fill("2030-07-09T19:30");
        await organizer
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect(
          organizer.getByText("All changes saved.", { exact: true }),
        ).toBeVisible();
        isolatedWp([
          "microsite",
          "publication-right",
          String(id),
          "grant",
          "--user=test_admin",
        ]);
        await organizer.reload();
        await goStep(organizer, "review");
        await organizer
          .getByRole("button", { name: "Publish", exact: true })
          .click();
        await expect(
          organizer.getByRole("link", { name: "View live page" }),
        ).toBeVisible();
        publicUrl = (await api(a, "GET", `/sites/${id}`)).data.publication
          .publicUrl;
        await organizer
          .getByRole("button", { name: "Preview invitation", exact: true })
          .click();
        await expect(organizer).toHaveURL(/\/preview$/);
        await expect(
          organizer.getByRole("button", { name: "Send RSVP" }),
        ).toHaveCount(0);
        assert.equal(
          (await api(a, "GET", `/sites/${id}/responses`)).data.summary.yes,
          0,
        );
        await organizer.goto(`/app/sites/${id}/responses`);
        await expect(
          organizer.getByRole("heading", { name: "RSVP responses" }),
        ).toBeVisible();
        await guest.goto(publicUrl);
        const form = guest.getByRole("region", { name: "RSVP", exact: true });
        await expect(
          form.getByRole("button", { name: "Send RSVP" }),
        ).toBeVisible();
        assert.equal(await guest.evaluate(() => window.scrollY), 0);
        await form.getByLabel("Your name").fill("Browser guest Élodie O'Neill");
        await form
          .getByLabel("How many people are coming, including you?")
          .fill("3");
        await form.screenshot({ path: join(artifacts, "guest-mobile.png") });
        await guest.route(
          /\/public\/sites\/[^/]+\/responses$/,
          async (route) => {
            await route.fetch();
            await route.abort("failed");
            await guest.unroute(/\/public\/sites\/[^/]+\/responses$/);
          },
        );
        await form.getByRole("button", { name: "Send RSVP" }).click();
        await expect(form.getByRole("alert")).toContainText(
          "Connection failed",
        );
        await form.getByRole("button", { name: "Send RSVP" }).click();
        await expect(
          form.getByText("Your response is saved.", { exact: true }),
        ).toBeVisible();
        privateLink = await form
          .getByLabel("Your private management link")
          .inputValue();
        assert.match(new URL(privateLink).hash, /^#[1-9][0-9]*\.[a-f0-9]{64}$/);
        assert.equal(
          (await api(a, "GET", `/sites/${id}/responses`)).data.summary.yes,
          1,
        );
        assert.equal(
          await guest.evaluate(
            () =>
              Object.keys(sessionStorage).filter((key) =>
                key.startsWith("microsite-rsvp-pending:"),
              ).length,
          ),
          0,
        );
        await form.getByRole("button", { name: "Copy private link" }).click();
        await expect(
          form.getByText("Private link copied.", { exact: true }),
        ).toBeVisible();
      },
    );

    await check(
      "RSVP browser owner totals update after guest changes, mobile/desktop fit and private deletion works after unpublish",
      async () => {
        await organizer
          .getByRole("button", { name: "Refresh responses" })
          .click();
        await expect(
          organizer.getByText("Participants: 3", { exact: false }),
        ).toBeVisible();
        await expect(
          organizer.getByRole("heading", {
            name: "Browser guest Élodie O'Neill",
          }),
        ).toBeVisible();
        await organizer.screenshot({
          path: join(artifacts, "organizer-desktop.png"),
          fullPage: true,
        });
        await guest.goto(privateLink);
        await expect(
          guest.getByRole("heading", { name: "Manage your RSVP" }),
        ).toBeVisible();
        await expect(guest.getByLabel("Your name")).toHaveValue(
          "Browser guest Élodie O'Neill",
        );
        await guest.getByLabel("Will you attend?").selectOption("no");
        await guest.getByRole("button", { name: "Update my response" }).focus();
        await guest.keyboard.press("Enter");
        await expect(
          guest.getByText("Your response has been updated.", { exact: true }),
        ).toBeVisible();
        await organizer
          .getByRole("button", { name: "Refresh responses" })
          .click();
        await expect(
          organizer.getByText("No responses: 1", { exact: false }),
        ).toBeVisible();
        await expect(
          organizer.getByText("Participants: 0", { exact: false }),
        ).toBeVisible();
        await guest.screenshot({
          path: join(artifacts, "management-mobile.png"),
          fullPage: true,
        });
        await organizer.setViewportSize({ width: 375, height: 900 });
        await organizer.screenshot({
          path: join(artifacts, "organizer-mobile.png"),
          fullPage: true,
        });
        assert.equal(
          await organizer.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await api(a, "POST", `/sites/${id}/unpublish`);
        await guest.reload();
        await expect(
          guest.getByText(
            "RSVP is unavailable. You can still delete your personal data.",
          ),
        ).toBeVisible();
        await expect(
          guest.getByRole("button", { name: "Update my response" }),
        ).toBeDisabled();
        await guest.getByRole("button", { name: "Delete my data" }).click();
        await guest
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
        await expect(guest.getByLabel("Your name")).toHaveValue(
          "Browser guest Élodie O'Neill",
        );
        await guest.getByRole("button", { name: "Delete my data" }).click();
        await guest
          .getByRole("button", { name: "Confirm permanent deletion" })
          .click();
        await expect(
          guest.getByText(
            "Your response and personal data have been permanently deleted.",
            { exact: true },
          ),
        ).toBeVisible();
        assert.equal(new URL(guest.url()).hash, "");
        await organizer
          .getByRole("button", { name: "Refresh responses" })
          .click();
        await expect(
          organizer.getByText("No responses: 0", { exact: false }),
        ).toBeVisible();
        await expect(
          organizer.getByRole("heading", {
            name: "Browser guest Élodie O'Neill",
          }),
        ).toHaveCount(0);
        assert.equal(
          requests.some(
            (url) =>
              url.includes("5173") ||
              url.includes("/assets/app-") ||
              /[?&](secret|token)=/.test(url),
          ),
          false,
        );
        assert.equal((await anonymous.cookies()).length, 0);
        await guest.goto(privateLink);
        await expect(guest.getByRole("alert")).toContainText(
          "This response is unavailable or the private link is invalid.",
        );
      },
    );
    await check(
      "RSVP organizer deletion corrects the final page, filters retain global totals and normal-motion form is independent of intro",
      async () => {
        resetRate();
        await api(a, "POST", `/sites/${id}/publish`);
        const site = (await api(a, "GET", `/sites/${id}`)).data;
        for (let index = 0; index < 21; index++) {
          const result = await anonymous.request.post(
            `/index.php?rest_route=/microsites/v1/public/sites/${site.publicId}/responses`,
            {
              headers: {
                Origin: origin,
                "X-Microsite-RSVP": randomBytes(32).toString("hex"),
                "Idempotency-Key": `${Math.floor(Date.now() / 1000)}.${randomBytes(32).toString("hex")}`,
              },
              data: {
                name: `Pagination guest ${index}`,
                attending: index % 2 ? "no" : "yes",
                partySize: index % 2 ? 0 : 1,
              },
            },
          );
          assert.equal(result.status(), 201);
        }
        await organizer
          .getByRole("button", { name: "Refresh responses" })
          .click();
        await expect(
          organizer.getByText("Page 1 of 2", { exact: true }),
        ).toBeVisible();
        await organizer
          .getByRole("button", { name: "Next page", exact: true })
          .click();
        await expect(
          organizer.getByText("Page 2 of 2", { exact: true }),
        ).toBeVisible();
        await organizer
          .getByRole("button", {
            name: "Delete response from Pagination guest 0",
            exact: true,
          })
          .click();
        await organizer
          .getByRole("button", { name: "Confirm delete response", exact: true })
          .click();
        await expect(
          organizer.getByText("Page 1 of 1", { exact: true }),
        ).toBeVisible();
        await organizer.getByLabel("Filter responses").selectOption("no");
        await expect(
          organizer.getByText("No responses: 10", { exact: false }),
        ).toBeVisible();
        await expect(
          organizer.getByText("Yes responses: 10", { exact: false }),
        ).toBeVisible();
        const motion = await browser.newContext({
          baseURL: origin,
          viewport: { width: 1440, height: 900 },
          reducedMotion: "no-preference",
        });
        try {
          const normal = await motion.newPage();
          await normal.goto(publicUrl);
          await normal
            .getByRole("region", { name: "RSVP", exact: true })
            .getByLabel("Your name")
            .fill("Before intro completion");
          await expect(
            normal.getByRole("button", { name: "Send RSVP", exact: true }),
          ).toBeEnabled();
          await normal
            .getByRole("region", { name: "RSVP", exact: true })
            .screenshot({ path: join(artifacts, "guest-desktop.png") });
          assert.equal(
            await normal.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
        } finally {
          await motion.close();
        }
      },
    );
  } finally {
    await browser.close();
  }
}
