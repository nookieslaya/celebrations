import { useState, type ReactNode } from "react";
import type { MediaAsset } from "../../../media/types";
import { Arrow, Copy, EventTime } from "../Elements";
import { sectionAnchor } from "../format";
import { Photo } from "../Photo";
import type { SectionProps } from "../types";

interface CompositionProps {
  children: ReactNode;
  photo?: ReactNode;
}

function TypographyHero({ children }: CompositionProps) {
  return <div className="me-hero-layout me-hero-typography">{children}</div>;
}

function PhotoFullHero({ children, photo }: CompositionProps) {
  return (
    <div className="me-hero-layout me-hero-photo-full">
      {photo}
      <div className="me-hero-overlay" aria-hidden="true" />
      {children}
    </div>
  );
}

function SplitHero({ children, photo }: CompositionProps) {
  return (
    <div className="me-hero-layout me-hero-split">
      {children}
      <div className="me-hero-split-photo">{photo}</div>
    </div>
  );
}

const compositions = {
  "photo-full": PhotoFullHero,
  split: SplitHero,
  typography: TypographyHero,
};

export function Hero({ section, context }: SectionProps<"hero">) {
  const [failedId, setFailedId] = useState<number | null>(null);
  const reference = section.content.photo;
  const asset: MediaAsset | undefined =
    reference && reference.attachmentId !== failedId
      ? context.media.get(reference.attachmentId)
      : undefined;
  const variant =
    section.variant !== "typography" && !asset ? "typography" : section.variant;
  const Composition = Object.hasOwn(compositions, variant)
    ? compositions[variant]
    : TypographyHero;
  const couple = context.draft.content.couple;
  const target = context.sections.find(
    (candidate) => candidate.type === section.content.cta && candidate.enabled,
  );
  const destination = target ? sectionAnchor(target) : undefined;
  const ctaLabels = {
    rsvp: "Guest response information",
    venues: "Explore the venues",
    schedule: "Discover the day",
  };
  const label =
    section.content.cta !== "none" ? ctaLabels[section.content.cta] : undefined;
  const anchor = sectionAnchor(section);
  if (!anchor) {
    return null;
  }
  return (
    <section
      id={anchor}
      className="me-hero"
      aria-labelledby={`${anchor}-heading`}
    >
      <Composition
        photo={
          asset && reference ? (
            <Photo
              asset={asset}
              alt={reference.alt}
              hero
              sizes={
                variant === "split" ? "(min-width: 56rem) 48vw, 100vw" : "100vw"
              }
              onUnavailable={() => setFailedId(asset.id)}
            />
          ) : undefined
        }
      >
        <div className="me-hero-content">
          {couple.heading.trim() && (
            <p className="me-kicker">{couple.heading}</p>
          )}
          <h1 id={`${anchor}-heading`} className="me-couple">
            {couple.firstName.trim() || couple.secondName.trim() ? (
              <>
                {couple.firstName.trim() && <span>{couple.firstName}</span>}
                {couple.firstName.trim() && couple.secondName.trim() && (
                  <span className="me-ampersand" aria-label="and">
                    &amp;
                  </span>
                )}
                {couple.secondName.trim() && <span>{couple.secondName}</span>}
              </>
            ) : (
              <span>Our wedding</span>
            )}
          </h1>
          <div className="me-hero-rule" aria-hidden="true" />
          <p className="me-hero-date">
            <EventTime
              value={context.draft.content.event}
              locale={context.locale}
            />
          </p>
          <Copy text={section.content.subtitle} className="me-hero-subtitle" />
          {destination && label && (
            <a className="me-button" href={`#${destination}`}>
              {label}
              <Arrow />
            </a>
          )}
        </div>
      </Composition>
    </section>
  );
}
