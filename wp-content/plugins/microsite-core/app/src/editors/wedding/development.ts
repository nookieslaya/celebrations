import { useCallback } from "react";
import { useSession } from "../../auth/SessionProvider";
import { useResource } from "../../components/Async";
import type { WeddingDraft } from "../../generated/drafts";
import type { PreviewDocument } from "../../preview/protocol";

export interface WeddingOption<Id extends string = string> {
  id: Id;
  name: string;
  description: string;
}

type HeroVariant = Extract<
  WeddingDraft["sections"][number],
  { type: "hero" }
>["variant"];
export interface WeddingOptions {
  heroVariants: WeddingOption<HeroVariant>[];
  palettes: WeddingOption<WeddingDraft["appearance"]["palette"]>[];
  fontPairs: WeddingOption<WeddingDraft["appearance"]["fontPair"]>[];
  entrances: WeddingOption<WeddingDraft["entrance"]["variant"]>[];
}

export interface WeddingDevelopment {
  options: WeddingOptions;
  presets: WeddingOption[];
  demo: PreviewDocument & { draft: WeddingDraft };
}

export function useWeddingDevelopment() {
  const { api } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => api.weddingDevelopment(signal),
    [api],
  );
  return useResource(load);
}
