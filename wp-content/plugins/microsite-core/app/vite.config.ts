import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl =
    env.WP_SITE_URL ||
    execFileSync("wp", ["option", "get", "home"], {
      cwd: resolve(process.cwd(), "../../../.."),
      encoding: "utf8",
    }).trim();
  const marker = resolve(".vite-dev.json");
  return {
    plugins: [
      react(),
      {
        name: "localwp-dev-marker",
        configureServer(server) {
          server.httpServer?.once("listening", () => {
            const address = server.httpServer?.address();
            if (address && typeof address !== "string")
              writeFileSync(
                marker,
                JSON.stringify({ origin: `http://127.0.0.1:${address.port}` }),
              );
          });
          const cleanup = () => rmSync(marker, { force: true });
          server.httpServer?.once("close", cleanup);
          const shutdown = () => {
            cleanup();
            void server.close().finally(() => process.exit(0));
          };
          process.once("SIGINT", shutdown);
          process.once("SIGTERM", shutdown);
        },
      },
    ],
    base: "./",
    server: { host: "127.0.0.1", cors: { origin: new URL(siteUrl).origin } },
    build: {
      manifest: true,
      outDir: "dist",
      rollupOptions: {
        input: {
          app: "src/main.tsx",
          public: "src/public.tsx",
          management: "src/rsvp-manage.tsx",
          preview: "src/preview-frame.tsx",
        },
      },
    },
  };
});
