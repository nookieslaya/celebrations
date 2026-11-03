import type { WeddingDraft } from "../../generated/drafts";

export const paletteLabels: Record<
  WeddingDraft["appearance"]["palette"],
  string
> = {
  "ivory-ink": "Ivory & Ink",
  "sage-linen": "Sage & Linen",
  "rose-stone": "Rose & Cocoa",
};

export const fontPairLabels: Record<
  WeddingDraft["appearance"]["fontPair"],
  string
> = {
  "editorial-serif": "Cormorant Garamond + Manrope",
  "modern-romantic": "Libre Baskerville + Source Sans 3",
  "timeless-classic": "Playfair Display + Inter",
};
