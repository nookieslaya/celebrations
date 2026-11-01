import assert from "node:assert/strict";

export async function runAccountTests({
  origin,
  request,
  contexts,
  check,
  isolatedWp,
  password,
}) {
  const credentials = { email: "account-flow@example.invalid", password };
  let account;
  let authenticated;

  function resetLimits() {
    isolatedWp([
      "eval",
      "global $wpdb; $wpdb->query(\"DELETE FROM {$wpdb->options} WHERE option_name LIKE '%microsite_attempt_%'\"); wp_cache_flush();",
    ]);
  }

  async function context() {
    const result = await request.newContext({ baseURL: origin });
    contexts.push(result);
    return result;
  }

  async function bootstrap(client) {
    const response = await client.get("/app/login");
    assert.match(response.headers()["cache-control"], /no-store/);
    const html = await response.text();
    const match =
      /<script id="microsite-config" type="application\/json">([^<]+)<\/script>/.exec(
        html,
      );
    assert.ok(match, "Document bootstrap missing");
    return JSON.parse(match[1]);
  }

  async function auth(client, operation, data, expected = 200, extra = {}) {
    const configuration = await bootstrap(client);
    const response = await client.post(
      `/wp-json/microsites/v1/auth/${operation}`,
      {
        data,
        headers: {
          Origin: origin,
          "X-Microsite-CSRF": configuration.authCsrfToken,
          ...extra,
        },
      },
    );
    const body = await response.json();
    assert.equal(response.status(), expected, JSON.stringify(body));
    assert.match(response.headers()["cache-control"], /no-store/);
    return { response, body };
  }

  await check(
    "registration disabled in WordPress is respected without altering the live setting",
    async () => {
      isolatedWp(["option", "update", "users_can_register", "0"]);
      const client = await context();
      assert.equal(
        (await bootstrap(client)).session.registrationEnabled,
        false,
      );
      const result = await auth(
        client,
        "register",
        { ...credentials, passwordConfirmation: password },
        403,
      );
      assert.equal(result.body.code, "microsite_registration_disabled");
      isolatedWp(["option", "update", "users_can_register", "1"]);
      resetLimits();
    },
  );

  await check(
    "account endpoints reject foreign/missing origins, missing tokens and other browser contexts",
    async () => {
      const client = await context();
      const other = await context();
      const configuration = await bootstrap(client);
      const otherToken = (await bootstrap(other)).authCsrfToken;
      assert.notEqual(configuration.authCsrfToken, otherToken);
      for (const operation of ["login", "register"]) {
        for (const headers of [
          { Origin: "https://evil.example" },
          { Origin: "null" },
          { Origin: "" },
          { "Sec-Fetch-Site": "cross-site" },
          { "X-Microsite-CSRF": "" },
          { "X-Microsite-CSRF": otherToken },
        ]) {
          const response = await client.post(
            `/wp-json/microsites/v1/auth/${operation}`,
            {
              data: { ...credentials, passwordConfirmation: password },
              headers: {
                Origin: origin,
                "X-Microsite-CSRF": configuration.authCsrfToken,
                ...headers,
              },
            },
          );
          assert.equal(response.status(), 403);
          assert.equal((await response.json()).code, "microsite_csrf_rejected");
        }
      }
    },
  );

  await check(
    "registration validates credentials and rejects role/capability escalation",
    async () => {
      const client = await context();
      for (const data of [
        {
          ...credentials,
          passwordConfirmation: password,
          role: "administrator",
        },
        {
          ...credentials,
          passwordConfirmation: password,
          capabilities: { manage_options: true },
        },
        { ...credentials, passwordConfirmation: "mismatched" },
        { ...credentials, email: "bad email", passwordConfirmation: password },
        { ...credentials, password: "short", passwordConfirmation: "short" },
      ]) {
        await auth(client, "register", data, 400);
      }
      resetLimits();
    },
  );

  await check(
    "new account is a minimal customer, auto login uses native cookies and a working fresh nonce",
    async () => {
      account = await context();
      const result = await auth(
        account,
        "register",
        { ...credentials, passwordConfirmation: password },
        201,
      );
      authenticated = result.body.data;
      assert.equal(authenticated.user.email, credentials.email);
      assert.ok(authenticated.nonce);
      const roles = JSON.parse(
        isolatedWp([
          "eval",
          `echo wp_json_encode(get_user_by('email', '${credentials.email}')->roles);`,
        ]),
      );
      assert.deepEqual(roles, ["microsite_customer"]);
      const session = await account.get("/wp-json/microsites/v1/session", {
        headers: { "X-WP-Nonce": authenticated.nonce },
      });
      assert.equal(session.status(), 200);
      assert.equal((await session.json()).data.user.id, authenticated.user.id);
      const created = await account.post("/wp-json/microsites/v1/sites", {
        headers: { "X-WP-Nonce": authenticated.nonce },
        data: {
          name: "Account HTTP project",
          siteType: "basic-page",
          templateId: "basic",
        },
      });
      assert.equal(created.status(), 201);
      const refreshed = await bootstrap(account);
      assert.equal(refreshed.session.user.id, authenticated.user.id);
      assert.ok(refreshed.session.nonce);
    },
  );

  await check(
    "customer is redirected out of wp-admin and has no admin bar; administrator keeps access",
    async () => {
      const adminPage = await account.get("/wp-admin/", { maxRedirects: 0 });
      assert.equal(adminPage.status(), 302);
      assert.equal(adminPage.headers().location, `${origin}/app/sites`);
      const front = await account.get("/");
      assert.equal((await front.text()).includes('id="wpadminbar"'), false);
      const admin = await context();
      await admin.get("/wp-login.php");
      await admin.post("/wp-login.php", {
        form: { log: "test_admin", pwd: password, testcookie: "1" },
      });
      assert.equal((await admin.get("/wp-admin/")).status(), 200);
    },
  );

  await check(
    "logout invalidates the native session and old nonce cannot access projects",
    async () => {
      const response = await account.post(
        "/wp-json/microsites/v1/auth/logout",
        { headers: { "X-WP-Nonce": authenticated.nonce } },
      );
      assert.equal(response.status(), 200);
      assert.equal((await response.json()).data.user, null);
      const rejected = await account.get("/wp-json/microsites/v1/sites", {
        headers: { "X-WP-Nonce": authenticated.nonce },
      });
      assert.equal([401, 403].includes(rejected.status()), true);
      assert.equal((await bootstrap(account)).session.user, null);
    },
  );

  await check(
    "email/password login has generic errors and restores a working session nonce",
    async () => {
      resetLimits();
      const wrong = await auth(
        account,
        "login",
        { ...credentials, password: "incorrect password" },
        401,
      );
      const absent = await auth(
        account,
        "login",
        { email: "absent@example.invalid", password: "incorrect password" },
        401,
      );
      assert.deepEqual(wrong.body, absent.body);
      const result = await auth(account, "login", credentials);
      const response = await account.get("/wp-json/microsites/v1/session", {
        headers: { "X-WP-Nonce": result.body.data.nonce },
      });
      assert.equal(response.status(), 200);
      assert.equal((await response.json()).data.user.email, credentials.email);
    },
  );

  await check(
    "login and registration limits have a bounded Retry-After and block further attempts",
    async () => {
      for (const [operation, limit] of [
        ["login", 10],
        ["register", 5],
      ]) {
        resetLimits();
        const client = await context();
        for (let attempt = 0; attempt < limit; attempt++) {
          await auth(
            client,
            operation,
            operation === "login"
              ? { email: "absent@example.invalid", password }
              : { email: "invalid", password, passwordConfirmation: password },
            operation === "login" ? 401 : 400,
          );
        }
        const blocked = await auth(client, operation, credentials, 429);
        assert.equal(blocked.body.code, "microsite_rate_limited");
        const retry = Number(blocked.response.headers()["retry-after"]);
        assert.equal(retry >= 1 && retry <= 900, true);
      }
      resetLimits();
    },
  );
}
