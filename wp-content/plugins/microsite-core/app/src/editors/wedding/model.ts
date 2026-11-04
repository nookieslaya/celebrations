import schema from "../../../../contracts/wedding.v1.json";
import type { WeddingDraft } from "../../generated/drafts";

export type WeddingSection = WeddingDraft["sections"][number];
export type SectionOf<Type extends WeddingSection["type"]> = Extract<
  WeddingSection,
  { type: Type }
>;
export type WeddingEvent = WeddingDraft["content"]["event"];

export const sectionNames: Record<WeddingSection["type"], string> = {
  hero: "Hero",
  invitation: "Invitation",
  countdown: "Countdown",
  venues: "Venues",
  schedule: "Schedule",
  story: "Our story",
  gallery: "Gallery",
  "guest-info": "Guest information",
  travel: "Travel and accommodation",
  gifts: "Gifts",
  faq: "Questions and answers",
  rsvp: "RSVP",
  contact: "Contact",
  footer: "Footer",
};

interface FieldContract {
  properties?: Record<string, FieldContract | undefined>;
  items?: FieldContract;
  maxLength?: number;
  maxItems?: number;
}

export function contentContract(type: WeddingSection["type"]): FieldContract {
  const branch = schema.properties.sections.items.oneOf.find(
    (candidate) => candidate.properties.type.enum[0] === type,
  );
  if (!branch) {
    throw new Error(`Unknown wedding section: ${type}`);
  }
  return branch.properties.content as FieldContract;
}

export function textLimit(
  type: WeddingSection["type"],
  field: string,
  list?: string,
): number {
  const content = contentContract(type);
  const properties = list
    ? content.properties?.[list]?.items?.properties
    : content.properties;
  const limit = properties?.[field]?.maxLength;
  if (limit === undefined) {
    throw new Error(`Missing text limit: ${type}.${field}`);
  }
  return limit;
}

export function listLimit(type: WeddingSection["type"], field: string): number {
  const limit = contentContract(type).properties?.[field]?.maxItems;
  if (limit === undefined) {
    throw new Error(`Missing list limit: ${type}.${field}`);
  }
  return limit;
}

export function stableId() {
  return `item-${crypto.randomUUID()}`;
}

export function emptyEvent(timeZone = "UTC"): WeddingEvent {
  return { localDateTime: "", timeZone, startsAt: "" };
}

export function defaultSection(type: WeddingSection["type"]): WeddingSection {
  const defaults = schema.properties.sections.default.find(
    (section) => section.type === type,
  );
  if (!defaults) {
    throw new Error(`Missing default section: ${type}`);
  }
  // This is the trusted JSON Schema default, never client-provided executable code.
  return { ...structuredClone(defaults), id: stableId() } as WeddingSection;
}

export function defaultRsvpSettings(): NonNullable<
  SectionOf<"rsvp">["content"]["settings"]
> {
  const defaults = schema.properties.sections.default.find(
    (section) => section.type === "rsvp",
  )?.content.settings;
  if (!defaults) {
    throw new Error("Missing RSVP settings defaults in wedding schema.");
  }
  return structuredClone(defaults);
}
