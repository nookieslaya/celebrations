const prefix = "microsite-editor-step:";

export function rememberedStep(user: number, site: number): string | null {
  try {
    return sessionStorage.getItem(`${prefix}${user}:${site}`);
  } catch {
    return null;
  }
}

export function rememberStep(user: number, site: number, step: string) {
  try {
    sessionStorage.setItem(`${prefix}${user}:${site}`, step);
  } catch {
    // Navigation history is optional. Draft content stays on the server.
  }
}

export function clearRememberedSteps() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Storage can be unavailable in private browsing.
  }
}
