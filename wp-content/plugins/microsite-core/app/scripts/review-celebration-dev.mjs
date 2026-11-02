import { readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const app = new URL("../", import.meta.url);
const renderer = new URL(
  "src/renderers/birthday-celebration/BirthdayCelebration.tsx",
  app,
);
const original = readFileSync(renderer, "utf8");
const html = new URL("celebration-review.temp.html", app);
const entry = new URL("celebration-review.temp.tsx", app);
const origin = JSON.parse(
  readFileSync(new URL(".vite-dev.json", app), "utf8"),
).origin;
const schema = JSON.parse(
  readFileSync(
    new URL("../contracts/birthday-invitation.v1.json", app),
    "utf8",
  ),
);
function defaults(property) {
  if (property.type !== "object") return property.default;
  return Object.fromEntries(
    Object.entries(property.properties)
      .filter(([, child]) => child.type === "object" || "default" in child)
      .map(([key, child]) => [key, defaults(child)]),
  );
}
const value = defaults(schema);
value.appearance.palette = "midnight-gold";
Object.assign(value.content, {
  celebrantName: "StrictMode Alex",
  age: 50,
  venueName: "The Glasshouse",
  address: "London",
});
const artifacts = new URL("test-results/celebration/", app);
mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch();
let page;
try {
  writeFileSync(
    html,
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="review"></div><script type="module" src="/celebration-review.temp.tsx"></script></body></html>',
  );
  writeFileSync(
    entry,
    `
import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BirthdayCelebration from "/src/renderers/birthday-celebration/BirthdayCelebration";
const originalTimeline = gsap.timeline;
const originalContext = HTMLCanvasElement.prototype.getContext;
window.celebrationReview = {
  triggers: () => ScrollTrigger.getAll().length,
  breakTimeline: () => { gsap.timeline = () => { throw new Error("Injected GSAP failure"); }; },
  breakCanvas: () => { HTMLCanvasElement.prototype.getContext = () => { throw new Error("Injected Canvas failure"); }; },
  restore: () => { gsap.timeline = originalTimeline; HTMLCanvasElement.prototype.getContext = originalContext; },
};
function Review() {
  const [visible, setVisible] = useState(true);
  return <><button id="toggle-review" onClick={() => setVisible(!visible)}>Mount / unmount</button>{visible && <BirthdayCelebration value={${JSON.stringify(value)}} />}</>;
}
createRoot(document.getElementById("review")).render(<StrictMode><Review /></StrictMode>);
`,
  );
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const active = new Set();
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = request((timestamp) => {
        active.delete(id);
        callback(timestamp);
      });
      active.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      active.delete(id);
      cancel(id);
    };
    window.celebrationActiveFrames = active;
  });
  await page.goto(`${origin}/celebration-review.temp.html`);
  await expect(
    page.getByRole("button", { name: "Open invitation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open invitation", exact: true })
    .click();
  await expect(page.locator(".celebration")).toHaveAttribute(
    "data-reveal-state",
    "complete",
  );
  await expect(page.locator(".celebration-confetti")).toHaveAttribute(
    "data-bursts",
    "1",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".celebration-canvas")).toHaveAttribute(
    "data-running",
    "false",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".celebration-canvas")).toHaveAttribute(
    "data-running",
    "true",
  );
  writeFileSync(
    renderer,
    original.replace(
      "GOOD COMPANY. BEAUTIFUL MEMORIES.",
      "GOOD COMPANY. STILL CELEBRATING.",
    ),
  );
  await expect(
    page.getByText("GOOD COMPANY. STILL CELEBRATING.", { exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".celebration-canvas")).toHaveCount(1);
  await page.locator("#toggle-review").click();
  await expect(page.locator(".celebration")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.celebrationReview.triggers()))
    .toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.celebrationActiveFrames.size))
    .toBeLessThanOrEqual(1);
  await page.locator("#toggle-review").click();
  await page
    .getByRole("button", { name: "Open invitation", exact: true })
    .click();
  await expect(page.locator(".celebration")).toHaveAttribute(
    "data-intro-state",
    "opening",
  );
  writeFileSync(
    renderer,
    original.replace(
      "GOOD COMPANY. BEAUTIFUL MEMORIES.",
      "GOOD COMPANY. OPENING REVIEW.",
    ),
  );
  await expect(
    page.getByText("GOOD COMPANY. OPENING REVIEW.", { exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".celebration")).toHaveAttribute(
    "data-intro-state",
    "opened",
  );
  await expect(page.locator(".celebration-cover")).toHaveCount(0);
  await page.locator("#toggle-review").click();
  await page.evaluate(() => window.celebrationReview.breakCanvas());
  await page.locator("#toggle-review").click();
  await page
    .getByRole("button", { name: "Open invitation", exact: true })
    .click();
  await expect(page.locator(".celebration-name")).toBeVisible();
  await expect(page.locator(".celebration")).toHaveAttribute(
    "data-reveal-state",
    "complete",
  );
  await page.locator("#toggle-review").click();
  await page.evaluate(() => {
    window.celebrationReview.restore();
    window.celebrationReview.breakTimeline();
  });
  await page.locator("#toggle-review").click();
  await page
    .getByRole("button", { name: "Open invitation", exact: true })
    .click();
  await expect(page.locator(".celebration-name")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Good people. Great night.",
      exact: true,
    }),
  ).toBeVisible();
  await page.locator("#toggle-review").click();
  await page.evaluate(() => window.celebrationReview.restore());
  await expect
    .poll(() => page.evaluate(() => window.celebrationReview.triggers()))
    .toBe(0);
  if (errors.length) throw new Error(errors.join("\n"));
  writeFileSync(
    new URL("dev-review.txt", artifacts),
    "PASS: StrictMode, real Vite HMR, remount, RAF/ScrollTrigger cleanup, visibility listener suspension, Canvas failure and GSAP failure fallback.\n",
  );
  console.log(
    "PASS celebration development review: StrictMode, HMR, cleanup, visibility and animation failure fallbacks.",
  );
} finally {
  writeFileSync(renderer, original);
  rmSync(html, { force: true });
  rmSync(entry, { force: true });
  await browser.close();
}
