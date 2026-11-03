import type { WeddingDraft } from "../../generated/drafts";
import type { MediaAsset } from "../../media/types";

export type WeddingSection = WeddingDraft["sections"][number];
export type SectionType = WeddingSection["type"];
export type SectionOf<Type extends SectionType> = Extract<
  WeddingSection,
  { type: Type }
>;
export type EventValue = WeddingDraft["content"]["event"];

export interface WeddingContext {
  draft: WeddingDraft;
  media: ReadonlyMap<number, MediaAsset>;
  sections: readonly WeddingSection[];
  preview: boolean;
  active: boolean;
  locale: string;
}

export interface SectionProps<Type extends SectionType> {
  section: SectionOf<Type>;
  context: WeddingContext;
}
