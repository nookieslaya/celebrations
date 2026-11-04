import { useMemo } from "react";
import type { RendererProps } from "../registry";
import { WeddingOpening } from "./openings/WeddingOpening";
import { sectionAnchor } from "./format";
import { sections } from "./sections/registry";
import type { WeddingContext } from "./types";
import "./fonts.css";
import "./tokens.css";
import "./modern-editorial.css";

export default function ModernEditorial({
  value,
  media = [],
  preview = false,
  previewContext,
  rsvp,
}: RendererProps) {
  const mediaById = useMemo(
    () => new Map(media.map((asset) => [asset.id, asset])),
    [media],
  );
  if (!("sections" in value)) {
    return <p role="alert">This renderer requires a wedding draft.</p>;
  }
  const enabled = value.sections.filter(
    (section) => section.enabled && sectionAnchor(section),
  );
  const context: WeddingContext = {
    draft: value,
    rsvp,
    media: mediaById,
    sections: enabled,
    preview,
    active: previewContext?.active ?? true,
    locale:
      typeof document === "undefined"
        ? "en"
        : document.documentElement.lang || "en",
  };
  context.sections = enabled.filter((section) =>
    sections[section.type].visible(section, context),
  );
  return (
    <div
      className="modern-editorial"
      data-palette={value.appearance.palette}
      data-font-pair={value.appearance.fontPair}
    >
      <WeddingOpening
        value={value}
        mediaToken={JSON.stringify(media)}
        context={previewContext}
        locale={context.locale}
      >
        <main>
          {context.sections.map((section) => (
            <SectionInstance
              key={section.id}
              section={section}
              context={context}
            />
          ))}
        </main>
      </WeddingOpening>
    </div>
  );
}

function SectionInstance({
  section,
  context,
}: {
  section: WeddingContext["sections"][number];
  context: WeddingContext;
}) {
  return sections[section.type].render(section, context);
}
