import type { WeddingDraft } from "../../generated/drafts";
import { sectionNames } from "./model";

export const weddingFocusEvent = "microsite-wedding-focus";

export function focusWeddingField(path: string, projectId: number) {
  window.dispatchEvent(
    new CustomEvent(weddingFocusEvent, { detail: { path, projectId } }),
  );
}

export function weddingFieldLabel(path: string, draft: WeddingDraft): string {
  if (path.startsWith("sections.")) {
    const section = draft.sections.find(
      (candidate) => candidate.id === path.split(".")[1],
    );
    const field =
      path
        .split(".")
        .at(-1)
        ?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? "details";
    return `${section ? sectionNames[section.type] : "Page section"} · ${field}`;
  }
  if (path.startsWith("content.venues.")) {
    return "Wedding details · Venue name and address";
  }
  if (path.startsWith("appearance.") || path.startsWith("entrance.")) {
    return "Appearance";
  }
  const names: Record<string, string> = {
    "content.couple.firstName": "First partner name",
    "content.couple.secondName": "Second partner name",
    "content.event.localDateTime": "Main date and time",
    "content.event.startsAt": "Main date and time",
  };
  return names[path] ?? "Wedding details";
}
