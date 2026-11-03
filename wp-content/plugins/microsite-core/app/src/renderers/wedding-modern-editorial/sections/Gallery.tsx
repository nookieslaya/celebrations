import { useState } from "react";
import type { MediaAsset } from "../../../media/types";
import { SectionShell } from "../Elements";
import { Photo } from "../Photo";
import type { SectionProps } from "../types";

function GalleryPhoto({ asset, alt }: { asset: MediaAsset; alt: string }) {
  const [unavailable, setUnavailable] = useState(false);
  return unavailable ? null : (
    <figure>
      <Photo
        asset={asset}
        alt={alt}
        sizes="(min-width: 56rem) 32vw, (min-width: 36rem) 48vw, 100vw"
        onUnavailable={() => setUnavailable(true)}
      />
    </figure>
  );
}

export function Gallery({ section, context }: SectionProps<"gallery">) {
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="A collection of moments"
      className="me-gallery-section"
    >
      <div className="me-gallery">
        {section.content.photos.map((photo) => {
          const asset = context.media.get(photo.attachmentId);
          return asset ? (
            <GalleryPhoto key={photo.id} asset={asset} alt={photo.alt} />
          ) : null;
        })}
      </div>
    </SectionShell>
  );
}
