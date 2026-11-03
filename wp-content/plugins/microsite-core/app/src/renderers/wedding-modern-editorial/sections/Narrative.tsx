import { useState } from "react";
import { Arrow, Copy, SectionShell } from "../Elements";
import { safeWebUrl, sectionAnchor } from "../format";
import { Photo } from "../Photo";
import type { SectionProps } from "../types";

export function Invitation({ section }: SectionProps<"invitation">) {
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="An invitation"
      className="me-invitation-section"
    >
      <Copy text={section.content.text} className="me-invitation-copy" />
    </SectionShell>
  );
}

export function Story({ section, context }: SectionProps<"story">) {
  const [failedId, setFailedId] = useState<number | null>(null);
  const reference = section.content.photo;
  const asset =
    reference && reference.attachmentId !== failedId
      ? context.media.get(reference.attachmentId)
      : undefined;
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="Our story"
      className="me-story-section"
    >
      <div className={`me-story${asset ? " me-story-with-photo" : ""}`}>
        <Copy text={section.content.text} />
        {asset && reference && (
          <figure>
            <Photo
              asset={asset}
              alt={reference.alt}
              sizes="(min-width: 56rem) 42vw, 100vw"
              onUnavailable={() => setFailedId(asset.id)}
            />
          </figure>
        )}
      </div>
    </SectionShell>
  );
}

export function Gifts({ section }: SectionProps<"gifts">) {
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="A thoughtful gesture"
      className="me-gifts-section"
    >
      <Copy text={section.content.text} />
      <ul className="me-link-list">
        {section.content.links.map((link) => {
          const url = safeWebUrl(link.url);
          return url ? (
            <li key={link.id}>
              <a
                className="me-text-link"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label.trim() || "More information"}
                <Arrow />
              </a>
            </li>
          ) : null;
        })}
      </ul>
    </SectionShell>
  );
}

export function Footer({ section, context }: SectionProps<"footer">) {
  const names = [
    context.draft.content.couple.firstName,
    context.draft.content.couple.secondName,
  ].filter((name) => name.trim());
  return (
    <footer className="me-footer" id={sectionAnchor(section)}>
      <div className="me-container">
        <Copy text={section.content.text} />
        {names.length > 0 && (
          <p className="me-footer-names">{names.join(" & ")}</p>
        )}
      </div>
    </footer>
  );
}
