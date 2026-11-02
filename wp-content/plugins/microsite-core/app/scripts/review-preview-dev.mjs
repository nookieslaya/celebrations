import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const app = new URL("../", import.meta.url);
const origin = JSON.parse(
  readFileSync(new URL(".vite-dev.json", app), "utf8"),
).origin;
const parentPath = new URL("preview-parent-review.temp.html", app);
const childPath = new URL("preview-frame-review.temp.html", app);
const cssPath = new URL("src/preview/frame.css", app);
const originalCss = readFileSync(cssPath, "utf8");
const schema = JSON.parse(
  readFileSync(
    new URL("../contracts/birthday-invitation.v1.json", app),
    "utf8",
  ),
);
function defaults(property) {
  if (property.type !== "object") {
    return property.default;
  }
  return Object.fromEntries(
    Object.entries(property.properties)
      .filter(([, child]) => child.type === "object" || "default" in child)
      .map(([key, child]) => [key, defaults(child)]),
  );
}
const draft = defaults(schema);
draft.appearance.palette = "midnight-gold";
draft.content.celebrantName = "Dev Alex";
draft.content.age = 50;
const message = {
  channel: "microsite-preview-v1",
  type: "render",
  document: {
    siteType: "birthday-invitation",
    templateId: "birthday-celebration",
    templateVersion: "1",
    draft,
  },
  context: { mode: "live", initiallyOpen: true, active: true, replay: 0 },
};
const browser = await chromium.launch();
try {
  writeFileSync(
    childPath,
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="public-root"></div><script type="module" src="/src/preview-frame.tsx"></script></body></html>',
  );
  writeFileSync(
    parentPath,
    `<!doctype html><html><body>
    <button id="change">Change preview text</button>
    <iframe title="Development preview" src="/preview-frame-review.temp.html" width="390" height="844"></iframe>
    <script type="module">
      const iframe = document.querySelector("iframe");
      const message = ${JSON.stringify(message)};
      const send = () => iframe.contentWindow.postMessage(message, location.origin);
      addEventListener("message", (event) => {
        if (event.origin === location.origin && event.source === iframe.contentWindow
          && event.data?.channel === "microsite-preview-v1" && event.data.type === "ready") send();
      });
      document.getElementById("change").onclick = () => {
        message.document.draft.content.celebrantName = "HMR Alex";
        send();
      };
    </script></body></html>`,
  );
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/preview-parent-review.temp.html`);
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("heading", { name: "Dev Alex", exact: true }),
  ).toBeVisible();
  await expect(frame.locator(".celebration")).toHaveAttribute(
    "data-opened",
    "true",
  );
  await frame.locator("html").evaluate((element) => {
    element.dataset.instanceMarker = "alive";
  });
  await page.getByRole("button", { name: "Change preview text" }).click();
  await expect(
    frame.getByRole("heading", { name: "HMR Alex", exact: true }),
  ).toBeVisible();
  writeFileSync(cssPath, `${originalCss}\n:root { --preview-hmr-check: 1; }\n`);
  await expect(frame.locator("html")).toHaveCSS("--preview-hmr-check", "1");
  await expect(frame.locator("html")).toHaveAttribute(
    "data-instance-marker",
    "alive",
  );
  await expect(frame.locator(".celebration")).toHaveAttribute(
    "data-opened",
    "true",
  );
  mkdirSync(new URL("test-results/live-preview/", app), { recursive: true });
  await page.screenshot({
    path: new URL("test-results/live-preview/development-hmr.png", app)
      .pathname,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS preview development: iframe entry, ready handshake, live updates and CSS HMR without reload or intro restart.",
  );
} finally {
  writeFileSync(cssPath, originalCss);
  rmSync(parentPath, { force: true });
  rmSync(childPath, { force: true });
  await browser.close();
}
