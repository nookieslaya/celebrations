import { runBrowserFlows } from "./browser-flows.mjs";
import { runAccountTests } from "./accounts.mjs";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import { request } from "../app/node_modules/playwright/index.mjs";

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const pluginDirectory = resolve(testsDirectory, "..");
const developmentDirectory = resolve(pluginDirectory, "../../..");

function wpAt(directory, args) {
  return execFileSync("wp", [`--path=${directory}`, ...args], {
    cwd: directory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60000,
  }).trim();
}

function developmentConfig(name) {
  return wpAt(developmentDirectory, ["config", "get", name, "--type=constant"]);
}

function assertIsolatedDatabase(database, developmentDatabase) {
  if (
    database === developmentDatabase ||
    !/^microsite_test_[a-z0-9_]{8,40}$/.test(database)
  ) {
    throw new Error(
      "Refusing database operation: a dedicated microsite_test_* database is required.",
    );
  }
}

const developmentDatabase = developmentConfig("DB_NAME");
const developmentHost = developmentConfig("DB_HOST");
const databaseSocket = wpAt(developmentDirectory, [
  "eval",
  "echo ini_get('mysqli.default_socket');",
]);
const databaseHost =
  developmentHost === "localhost" && databaseSocket
    ? `localhost:${databaseSocket}`
    : developmentHost;
const projectId = createHash("sha256")
  .update(developmentDirectory)
  .digest("hex")
  .slice(0, 16);
const testDatabase = process.env.TEST_DB_NAME ?? `microsite_test_${projectId}`;

// This guard runs before creating files, databases, servers or test data.
assertIsolatedDatabase(testDatabase, developmentDatabase);

if (process.argv.includes("--guard-only")) {
  console.log(
    "Database isolation guard passed; no database operation performed.",
  );
  process.exit(0);
}

const existingDatabases = JSON.parse(
  wpAt(developmentDirectory, [
    "eval",
    "global $wpdb; echo wp_json_encode($wpdb->get_col('SHOW DATABASES'));",
  ]),
);
const databaseExists = existingDatabases.includes(testDatabase);
const stateDirectory = join(homedir(), ".cache", "microsite-core", projectId);
mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
const persistentMarker = join(stateDirectory, `${testDatabase}.json`);
const lockDirectory = join(stateDirectory, `${testDatabase}.lock`);
const expectedOwnership = {
  database: testDatabase,
  developmentDirectory,
  developmentDatabase,
  databaseHost,
};

function assertPersistentOwnership() {
  assertIsolatedDatabase(testDatabase, developmentDatabase);
  if (!existsSync(persistentMarker)) {
    throw new Error(
      "Refusing to clean an existing database without this project's ownership marker.",
    );
  }
  assert.deepEqual(
    JSON.parse(readFileSync(persistentMarker, "utf8")),
    expectedOwnership,
  );
}

if (databaseExists) {
  assertPersistentOwnership();
}

try {
  mkdirSync(lockDirectory, { mode: 0o700 });
  writeFileSync(join(lockDirectory, "pid"), String(process.pid), {
    mode: 0o600,
  });
} catch {
  throw new Error(
    `Test database is locked. Check the running process before removing ${lockDirectory}.`,
  );
}

const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "microsite-integration-"),
);
const ownershipMarker = join(temporaryDirectory, ".microsite-test-owner");
writeFileSync(ownershipMarker, testDatabase, { mode: 0o600 });
let server;
const contexts = [];
let checks = 0;

function phpString(value) {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

async function freePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  const port = address.port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

async function check(name, callback) {
  await callback();
  checks++;
  console.log(`PASS ${name}`);
}

try {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;

  // Root PHP files must be copied: symlink __DIR__ would point to the live site.
  for (const file of readdirSync(developmentDirectory)) {
    if (
      file.endsWith(".php") &&
      file !== "wp-config.php" &&
      file !== "local-xdebuginfo.php"
    ) {
      copyFileSync(
        join(developmentDirectory, file),
        join(temporaryDirectory, file),
      );
    }
  }
  cpSync(
    join(developmentDirectory, "wp-admin"),
    join(temporaryDirectory, "wp-admin"),
    { recursive: true },
  );
  cpSync(
    join(developmentDirectory, "wp-includes"),
    join(temporaryDirectory, "wp-includes"),
    { recursive: true },
  );
  cpSync(
    join(developmentDirectory, "wp-content/themes"),
    join(temporaryDirectory, "wp-content/themes"),
    { recursive: true },
  );
  mkdirSync(join(temporaryDirectory, "wp-content/plugins"), {
    recursive: true,
  });
  mkdirSync(join(temporaryDirectory, "wp-content/mu-plugins"), {
    recursive: true,
  });
  symlinkSync(
    pluginDirectory,
    join(temporaryDirectory, "wp-content/plugins/microsite-core"),
  );
  copyFileSync(
    join(testsDirectory, "session-fixture.php"),
    join(temporaryDirectory, "wp-content/mu-plugins/session-fixture.php"),
  );
  copyFileSync(
    join(testsDirectory, "router.php"),
    join(temporaryDirectory, "router.php"),
  );

  const constants = {
    DB_NAME: testDatabase,
    DB_HOST: databaseHost,
    DB_USER: developmentConfig("DB_USER"),
    DB_PASSWORD: developmentConfig("DB_PASSWORD"),
    DB_CHARSET: "utf8mb4",
    DB_COLLATE: "",
    WP_HOME: origin,
    WP_SITEURL: origin,
    WP_ENVIRONMENT_TYPE: "development",
    WP_DEBUG_LOG: join(temporaryDirectory, "php-errors.log"),
  };

  for (const salt of [
    "AUTH_KEY",
    "SECURE_AUTH_KEY",
    "LOGGED_IN_KEY",
    "NONCE_KEY",
    "AUTH_SALT",
    "SECURE_AUTH_SALT",
    "LOGGED_IN_SALT",
    "NONCE_SALT",
  ]) {
    constants[salt] = randomBytes(48).toString("hex");
  }

  const definitions = Object.entries(constants).map(
    ([key, value]) => `define( ${phpString(key)}, ${phpString(value)} );`,
  );
  writeFileSync(
    join(temporaryDirectory, "wp-config.php"),
    [
      "<?php",
      ...definitions,
      "define( 'MICROSITE_INTEGRATION_TEST', true );",
      "define( 'DISABLE_WP_CRON', true );",
      "define( 'WP_DEBUG', true );",
      "define( 'WP_DEBUG_DISPLAY', false );",
      "$table_prefix = 'ms_test_';",
      "if ( ! defined( 'ABSPATH' ) ) {",
      "    define( 'ABSPATH', __DIR__ . '/' );",
      "}",
      "require_once ABSPATH . 'wp-settings.php';",
    ].join("\n"),
    { mode: 0o600 },
  );

  function isolatedWp(args) {
    const configuredDatabase = wpAt(temporaryDirectory, [
      "config",
      "get",
      "DB_NAME",
      "--type=constant",
    ]);
    assertIsolatedDatabase(configuredDatabase, developmentDatabase);
    assert.equal(configuredDatabase, testDatabase);
    assert.equal(readFileSync(ownershipMarker, "utf8"), testDatabase);
    assert.notEqual(resolve(temporaryDirectory), resolve(developmentDirectory));
    return wpAt(temporaryDirectory, args);
  }

  if (databaseExists) {
    assertPersistentOwnership();
    // Only this runner's ms_test_* tables are removed. The database itself stays.
    assert.equal(
      wpAt(temporaryDirectory, [
        "config",
        "get",
        "table_prefix",
        "--type=variable",
      ]),
      "ms_test_",
    );
    isolatedWp(["db", "clean", "--yes"]);
    console.log(`Reusing dedicated test database: ${testDatabase}`);
  } else {
    isolatedWp(["db", "create"]);
    writeFileSync(
      persistentMarker,
      JSON.stringify(expectedOwnership, null, 2),
      { mode: 0o600 },
    );
    console.log(`Created dedicated test database once: ${testDatabase}`);
  }

  const password = randomBytes(24).toString("hex");
  isolatedWp([
    "core",
    "install",
    `--url=${origin}`,
    "--title=Microsite integration tests",
    "--admin_user=test_admin",
    `--admin_password=${password}`,
    "--admin_email=admin@example.invalid",
    "--skip-email",
  ]);
  isolatedWp(["plugin", "activate", "microsite-core"]);
  isolatedWp(["option", "update", "permalink_structure", "/%postname%/"]);
  isolatedWp(["rewrite", "flush"]);

  const userA = Number(
    isolatedWp([
      "user",
      "create",
      "client_a",
      "a@example.invalid",
      "--role=microsite_customer",
      `--user_pass=${password}`,
      "--porcelain",
    ]),
  );
  const userB = Number(
    isolatedWp([
      "user",
      "create",
      "client_b",
      "b@example.invalid",
      "--role=microsite_customer",
      `--user_pass=${password}`,
      "--porcelain",
    ]),
  );
  isolatedWp([
    "user",
    "create",
    "subscriber_test",
    "subscriber@example.invalid",
    "--role=subscriber",
    `--user_pass=${password}`,
    "--porcelain",
  ]);

  server = spawn(
    "php",
    [
      "-d",
      "auto_prepend_file=",
      "-d",
      "auto_append_file=",
      "-S",
      `127.0.0.1:${port}`,
      "-t",
      temporaryDirectory,
      join(temporaryDirectory, "router.php"),
    ],
    {
      cwd: temporaryDirectory,
      stdio: "ignore",
    },
  );

  const anonymous = await request.newContext({ baseURL: origin });
  contexts.push(anonymous);
  const deadline = Date.now() + 15000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const response = await anonymous.get("/wp-login.php", { timeout: 1000 });
      if (response.ok()) {
        ready = true;
        break;
      }
    } catch {
      // Bounded readiness polling, with no changes to the development server.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.equal(ready, true, "Temporary WordPress did not become ready.");

  async function login(username) {
    const context = await request.newContext({ baseURL: origin });
    contexts.push(context);
    await context.get("/wp-login.php");
    await context.post("/wp-login.php", {
      form: {
        log: username,
        pwd: password,
        "wp-submit": "Log In",
        redirect_to: `${origin}/wp-admin/`,
        testcookie: "1",
      },
    });
    const nonceResponse = await context.get(
      "/wp-admin/admin-ajax.php?action=microsite_test_nonce",
    );
    const nonceText = await nonceResponse.text();
    assert.equal(nonceResponse.ok(), true, nonceText.slice(0, 1500));
    let bootstrap;
    try {
      bootstrap = JSON.parse(nonceText);
    } catch {
      throw new Error(
        `Nonce fixture returned invalid JSON: ${nonceText.slice(0, 1500)}`,
      );
    }
    assert.equal(
      bootstrap.success,
      true,
      `Real cookie session failed for ${username}`,
    );
    return { context, nonce: bootstrap.data.nonce };
  }

  const a = await login("client_a");
  const b = await login("client_b");
  const admin = await login("test_admin");
  const subscriber = await login("subscriber_test");

  async function api(
    session,
    method,
    path,
    payload,
    expected = 200,
    nonce = session?.nonce,
  ) {
    const context = session?.context ?? anonymous;
    const headers = nonce ? { "X-WP-Nonce": nonce } : {};
    const response = await context.fetch(
      `/index.php?rest_route=/microsites/v1${path}`,
      {
        method,
        headers,
        data: payload,
      },
    );
    const body = await response.json();
    assert.equal(
      response.status(),
      expected,
      `${method} ${path}: ${JSON.stringify(body)}`,
    );
    assert.match(response.headers()["cache-control"], /no-store/);
    return body;
  }

  await check(
    "production shell serves both app paths and manifest assets independently of the running Vite",
    async () => {
      for (const path of ["/app/", "/app/sites"]) {
        const response = await anonymous.get(path);
        assert.equal(response.status(), 200);
        const html = await response.text();
        assert.match(html, /"mode":"production"/);
        assert.doesNotMatch(html, /@vite\/client|@react-refresh/);
        const assets = [
          ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
        ];
        assert.equal(assets.length >= 2, true);
        for (const asset of assets) {
          assert.equal((await anonymous.get(asset[1])).ok(), true);
        }
      }
    },
  );

  let siteA;
  let siteB;
  const createPayload = {
    name: "Internal project name",
    siteType: "basic-page",
    templateId: "basic",
  };

  await check(
    "public catalog exposes active metadata without renderer internals",
    async () => {
      const catalog = await api(null, "GET", "/catalog");
      assert.equal(catalog.data.siteTypes[0].id, "basic-page");
      assert.equal(catalog.data.templates[0].id, "basic");
      assert.equal("rendererKey" in catalog.data.templates[0], false);
      assert.equal("schema" in catalog.data.siteTypes[0], false);
    },
  );

  await check(
    "anonymous requests cannot list, create, read or update projects",
    async () => {
      await api(null, "GET", "/sites", undefined, 401);
      await api(null, "POST", "/sites", createPayload, 401);
      await api(null, "GET", "/sites/123", undefined, 401);
      await api(null, "PATCH", "/sites/123", { name: "Changed" }, 401);
    },
  );

  await check(
    "real cookie session without nonce or with invalid nonce cannot write",
    async () => {
      await api(a, "POST", "/sites", createPayload, 401, null);
      await api(a, "POST", "/sites", createPayload, 403, "incorrect-nonce");
      await api(a, "GET", "/sites", undefined, 401, null);
      const list = await api(a, "GET", "/sites");
      assert.equal(list.data.pagination.total, 0);
    },
  );

  await check(
    "creation uses schema defaults, backend versions, unique public IDs and session owner",
    async () => {
      siteA = (await api(a, "POST", "/sites", createPayload, 201)).data;
      siteB = (
        await api(
          b,
          "POST",
          "/sites",
          { ...createPayload, name: "B project" },
          201,
        )
      ).data;
      assert.equal(siteA.draft.content.heading, "A new beginning");
      assert.equal(siteA.draft.appearance.accent, "sage");
      assert.notEqual(siteA.name, siteA.draft.content.heading);
      assert.equal(siteA.schemaVersion, 1);
      assert.equal(siteA.templateVersion, "1.0.0");
      assert.equal(siteA.status, "draft");
      assert.match(siteA.publicId, /^[a-f0-9]{32}$/);
      assert.notEqual(siteA.publicId, siteB.publicId);
      assert.equal(Number.isFinite(Date.parse(siteA.createdAt)), true);
      assert.equal(
        Number(
          isolatedWp(["post", "get", String(siteA.id), "--field=post_author"]),
        ),
        userA,
      );
      assert.equal(
        Number(
          isolatedWp(["post", "get", String(siteB.id), "--field=post_author"]),
        ),
        userB,
      );
      assert.equal("owner" in siteA, false);
      assert.equal("post_author" in siteA, false);
      assert.equal("published" in siteA, false);
    },
  );

  await check("list is owner-scoped, including administrators", async () => {
    assert.deepEqual(
      (await api(a, "GET", "/sites")).data.items.map((site) => site.id),
      [siteA.id],
    );
    assert.deepEqual(
      (await api(b, "GET", "/sites")).data.items.map((site) => site.id),
      [siteB.id],
    );
    assert.equal((await api(admin, "GET", "/sites")).data.items.length, 0);
  });

  await check(
    "foreign and nonexistent projects return the same 404 for read and edit",
    async () => {
      for (const method of ["GET", "PATCH"]) {
        const payload = method === "PATCH" ? { name: "Stolen" } : undefined;
        const foreign = await api(
          a,
          method,
          `/sites/${siteB.id}`,
          payload,
          404,
        );
        const absent = await api(a, method, "/sites/99999999", payload, 404);
        assert.deepEqual(foreign, absent);
        await api(b, method, `/sites/${siteA.id}`, payload, 404);
      }
    },
  );

  await check(
    "capabilities independently restrict logged-in accounts",
    async () => {
      await api(subscriber, "GET", "/sites", undefined, 403);
      await api(subscriber, "POST", "/sites", createPayload, 403);
      await api(subscriber, "GET", `/sites/${siteA.id}`, undefined, 404);
      isolatedWp([
        "eval",
        `get_user_by('id', ${userA})->add_cap('edit_ms_sites', false);`,
      ]);
      await api(a, "GET", `/sites/${siteA.id}`, undefined, 404);
      await api(a, "PATCH", `/sites/${siteA.id}`, { name: "Denied" }, 404);
      isolatedWp(["user", "remove-cap", String(userA), "edit_ms_sites"]);
    },
  );

  const editedDraft = {
    content: {
      heading: "A customer's new page",
      description: "Plain text with a newline\nand a backslash \\.",
    },
    appearance: { accent: "rose" },
  };

  await check(
    "valid own draft update is persisted, with name independent from heading",
    async () => {
      await api(
        a,
        "PATCH",
        `/sites/${siteA.id}`,
        { name: "No nonce" },
        401,
        null,
      );
      await api(
        a,
        "PATCH",
        `/sites/${siteA.id}`,
        { name: "Bad nonce" },
        403,
        "incorrect",
      );
      assert.equal(
        (await api(a, "GET", `/sites/${siteA.id}`)).data.name,
        createPayload.name,
      );
      const updated = (
        await api(a, "PATCH", `/sites/${siteA.id}`, { draft: editedDraft })
      ).data;
      assert.equal(updated.name, createPayload.name);
      assert.deepEqual(updated.draft, editedDraft);
      const read = (await api(a, "GET", `/sites/${siteA.id}`)).data;
      assert.deepEqual(read.draft, editedDraft);
      assert.equal(read.createdAt, siteA.createdAt);
      const renamed = (
        await api(a, "PATCH", `/sites/${siteA.id}`, {
          name: "New internal name",
        })
      ).data;
      assert.equal(renamed.name, "New internal name");
      assert.deepEqual(renamed.draft, editedDraft);
    },
  );

  await check(
    "administrator with explicit capabilities can read and edit another owner's draft",
    async () => {
      await api(admin, "GET", `/sites/${siteB.id}`);
      const result = await api(admin, "PATCH", `/sites/${siteB.id}`, {
        name: "Admin edit",
      });
      assert.equal(result.data.name, "Admin edit");
      assert.equal(
        Number(
          isolatedWp(["post", "get", String(siteB.id), "--field=post_author"]),
        ),
        userB,
      );
      isolatedWp([
        "eval",
        "get_user_by('login', 'test_admin')->add_cap('manage_ms_sites', false);",
      ]);
      await api(admin, "GET", `/sites/${siteB.id}`, undefined, 404);
      isolatedWp(["user", "remove-cap", "test_admin", "manage_ms_sites"]);
    },
  );

  await check(
    "system fields and immutable selection/versions are rejected",
    async () => {
      const forbidden = {
        owner: userB,
        post_author: userB,
        publicId: "chosen",
        status: "publish",
        capabilities: ["manage_options"],
        createdAt: "now",
        updatedAt: "now",
        paymentStatus: "paid",
        published: editedDraft,
        unknown: true,
        schemaVersion: 2,
        templateVersion: "2.0.0",
      };
      const before = await api(a, "GET", `/sites/${siteA.id}`);
      for (const [key, value] of Object.entries(forbidden)) {
        await api(a, "POST", "/sites", { ...createPayload, [key]: value }, 400);
        await api(a, "PATCH", `/sites/${siteA.id}`, { [key]: value }, 400);
      }
      for (const key of ["siteType", "templateId"]) {
        await api(a, "PATCH", `/sites/${siteA.id}`, { [key]: "basic" }, 400);
      }
      assert.deepEqual(await api(a, "GET", `/sites/${siteA.id}`), before);
    },
  );

  await check(
    "unknown IDs, path-like IDs, wrong types and missing selection are rejected",
    async () => {
      for (const payload of [
        { ...createPayload, siteType: "unknown" },
        { ...createPayload, templateId: "../basic.php" },
        { ...createPayload, siteType: 1 },
        { ...createPayload, templateId: null },
        { name: "Missing selection" },
        { ...createPayload, name: " " },
        { ...createPayload, name: "x".repeat(121) },
        { ...createPayload, name: "<script>alert(1)</script>" },
      ]) {
        await api(a, "POST", "/sites", payload, 400);
      }
    },
  );

  await check(
    "full draft validation rejects partial merges, HTML, unknown properties and invalid text/appearance",
    async () => {
      const invalidDrafts = [
        null,
        [],
        "text",
        {},
        { content: editedDraft.content },
        { ...editedDraft, unknown: 1 },
        { ...editedDraft, content: { ...editedDraft.content, unknown: 1 } },
        { ...editedDraft, appearance: { accent: "purple" } },
        {
          ...editedDraft,
          appearance: { ...editedDraft.appearance, css: "body{}" },
        },
        { ...editedDraft, content: { ...editedDraft.content, heading: "" } },
        {
          ...editedDraft,
          content: { ...editedDraft.content, heading: "x".repeat(161) },
        },
        {
          ...editedDraft,
          content: { ...editedDraft.content, description: "x".repeat(2001) },
        },
        {
          ...editedDraft,
          content: {
            ...editedDraft.content,
            heading: "<img src=x onerror=alert(1)>",
          },
        },
        {
          ...editedDraft,
          content: {
            ...editedDraft.content,
            description: "&lt;script&gt;alert(1)&lt;/script&gt;",
          },
        },
        { ...editedDraft, content: { ...editedDraft.content, heading: 123 } },
      ];
      const before = await api(a, "GET", `/sites/${siteA.id}`);
      for (const draft of invalidDrafts) {
        await api(
          a,
          "PATCH",
          `/sites/${siteA.id}`,
          { name: "Must not be saved", draft },
          400,
        );
        await api(a, "POST", "/sites", { ...createPayload, draft }, 400);
        assert.deepEqual(await api(a, "GET", `/sites/${siteA.id}`), before);
      }
    },
  );

  await check(
    "incompatible stored schema/template versions block edits until explicit migration",
    async () => {
      const original = JSON.parse(
        isolatedWp([
          "post",
          "meta",
          "get",
          String(siteA.id),
          "_microsite_data",
          "--format=json",
        ]),
      );
      for (const property of [
        "schemaVersion",
        "templateVersion",
        "siteType",
        "templateId",
      ]) {
        const invalid = {
          ...original,
          [property]: property === "schemaVersion" ? 999 : "unknown",
        };
        isolatedWp([
          "post",
          "meta",
          "update",
          String(siteA.id),
          "_microsite_data",
          JSON.stringify(invalid),
          "--format=json",
        ]);
        await api(
          a,
          "PATCH",
          `/sites/${siteA.id}`,
          { name: "Blocked" },
          property.endsWith("Version") ? 409 : 400,
        );
      }
      isolatedWp([
        "post",
        "meta",
        "update",
        String(siteA.id),
        "_microsite_data",
        JSON.stringify(original),
        "--format=json",
      ]);
    },
  );

  await check(
    "list pagination is bounded and stable, without leaking other owners",
    async () => {
      for (let index = 0; index < 3; index++) {
        await api(
          a,
          "POST",
          "/sites",
          { ...createPayload, name: `Extra ${index}` },
          201,
        );
      }
      const first = (await api(a, "GET", "/sites&page=1&per_page=2")).data;
      const second = (await api(a, "GET", "/sites&page=2&per_page=2")).data;
      assert.equal(first.pagination.total, 4);
      assert.equal(first.pagination.totalPages, 2);
      assert.equal(first.items.length, 2);
      assert.equal(second.items.length, 2);
      assert.equal(
        new Set([...first.items, ...second.items].map((site) => site.id)).size,
        4,
      );
      assert.equal(
        [...first.items, ...second.items].some((site) => site.id === siteB.id),
        false,
      );
      await api(a, "GET", "/sites&per_page=51", undefined, 400);
      await api(a, "GET", "/sites&page=0", undefined, 400);
      await api(a, "GET", "/sites&per_page=-1", undefined, 400);
      await api(a, "GET", "/sites&page=1.5", undefined, 400);
    },
  );

  await check(
    "CPT has no default REST route, public single, archive or search disclosure",
    async () => {
      const rest = await anonymous.get("/index.php?rest_route=/wp/v2/ms_site");
      assert.equal(rest.status(), 404);
      for (const path of [
        `/index.php?post_type=ms_site&p=${siteA.id}`,
        `/index.php?p=${siteA.id}`,
        `/index.php?ms_site=${siteA.publicId}`,
        "/index.php?post_type=ms_site",
        "/index.php?s=New%20internal%20name",
      ]) {
        const response = await anonymous.get(path);
        const html = await response.text();
        assert.equal(html.includes(editedDraft.content.heading), false);
        assert.equal(html.includes("New internal name"), false);
        assert.equal(response.status() >= 500, false);
      }
      const single = await anonymous.get(
        `/index.php?post_type=ms_site&p=${siteA.id}`,
      );
      assert.equal(single.status(), 404);
      const publicIdUrl = await anonymous.get(`/s/${siteA.publicId}/`);
      assert.equal(
        (await publicIdUrl.text()).includes(editedDraft.content.heading),
        false,
      );
      const publicSlug = await anonymous.get(`/${siteA.publicId}/`);
      assert.equal(
        (await publicSlug.text()).includes(editedDraft.content.heading),
        false,
      );
      const typeMetadata = await anonymous.get(
        "/index.php?rest_route=/wp/v2/types/ms_site",
      );
      assert.equal(typeMetadata.status(), 401);
      assert.equal((await typeMetadata.json()).code, "rest_cannot_read_type");
      const settings = JSON.parse(
        isolatedWp([
          "eval",
          "echo wp_json_encode(get_post_type_object('ms_site')); ",
        ]),
      );
      assert.equal(settings.public, false);
      assert.equal(settings.publicly_queryable, false);
      assert.equal(settings.show_in_rest, false);
      assert.equal(settings.has_archive, false);
    },
  );

  await check(
    "role setup is idempotent and runs on plugin updates without reactivation",
    async () => {
      const before = JSON.parse(
        isolatedWp(["eval", "echo wp_json_encode(wp_roles()->roles);"]),
      );
      isolatedWp(["option", "delete", "microsite_permissions_version"]);
      isolatedWp([
        "eval",
        "Microsite\\Core\\Permissions::install(); Microsite\\Core\\Permissions::install();",
      ]);
      const after = JSON.parse(
        isolatedWp(["eval", "echo wp_json_encode(wp_roles()->roles);"]),
      );
      assert.deepEqual(after, before);
      assert.deepEqual(
        Object.keys(after.microsite_customer.capabilities).sort(),
        ["create_ms_sites", "edit_ms_sites", "read"],
      );
      assert.equal(after.subscriber.capabilities.create_ms_sites, undefined);
    },
  );

  await runAccountTests({
    origin,
    request,
    contexts,
    check,
    isolatedWp,
    password,
  });
  await runBrowserFlows({ origin, password, check, isolatedWp });

  if (existsSync(join(temporaryDirectory, "php-errors.log"))) {
    const log = readFileSync(
      join(temporaryDirectory, "php-errors.log"),
      "utf8",
    );
    assert.doesNotMatch(
      log,
      /PHP (Fatal error|Warning|Notice|Deprecated)/,
      "PHP emitted runtime diagnostics.",
    );
  }
  console.log(
    `Integration suite complete: ${checks} checks passed on real WordPress HTTP sessions.`,
  );
} catch (error) {
  if (existsSync(join(temporaryDirectory, "php-errors.log"))) {
    console.error(
      readFileSync(join(temporaryDirectory, "php-errors.log"), "utf8").slice(
        -6000,
      ),
    );
  }
  throw error;
} finally {
  for (const context of contexts) {
    await context.dispose();
  }
  if (server) {
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await stopped;
  }
  console.log(
    `Dedicated test database retained for the next run: ${testDatabase}`,
  );
  rmSync(temporaryDirectory, { recursive: true, force: true });
  rmSync(lockDirectory, { recursive: true, force: true });
}
