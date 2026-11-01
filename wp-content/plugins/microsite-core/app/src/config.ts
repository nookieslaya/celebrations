import type { Session } from "./api/client";

export interface AppConfig {
  appUrl: string;
  restUrl: string;
  mode: "development" | "production";
  session: Session;
  authCsrfToken: string;
}

export const config: AppConfig = JSON.parse(
  document.getElementById("microsite-config")!.textContent!,
);

export const appBase = new URL(config.appUrl).pathname.replace(/\/$/, "");
