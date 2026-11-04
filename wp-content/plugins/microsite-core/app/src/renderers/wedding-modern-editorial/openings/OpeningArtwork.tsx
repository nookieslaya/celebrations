import type { WeddingDraft } from "../../../generated/drafts";
import { formatEvent } from "../format";
import type { OpeningVariant } from "./registry";

export function OpeningArtwork({
  variant,
  value,
  locale,
}: {
  variant: OpeningVariant;
  value: WeddingDraft;
  locale: string;
}) {
  const couple = value.content.couple;
  const names = [couple.firstName, couple.secondName].filter((name) =>
    name.trim(),
  );
  const label = names.join(" & ") || "Our wedding";
  if (variant === "envelope") {
    return (
      <>
        <div
          className="me-envelope-art"
          aria-label={`An invitation from ${label}`}
        >
          <div className="me-envelope-back" aria-hidden="true" />
          <div className="me-envelope-card">
            <p className="me-kicker">You are invited</p>
            <h2 id="me-opening-heading">{label}</h2>
            <p>{formatEvent(value.content.event, locale)}</p>
          </div>
          <div className="me-envelope-pocket" aria-hidden="true" />
          <div className="me-envelope-flap" aria-hidden="true" />
        </div>
        <p className="me-envelope-address" aria-hidden="true">
          {label}
        </p>
      </>
    );
  }
  return (
    <div className="me-opening-typography">
      <p className="me-kicker">A day to share</p>
      <h2 id="me-opening-heading">
        {names.length ? (
          names.map((name, index) => (
            <span
              className="me-opening-name"
              key={index === 0 ? "first-partner" : "second-partner"}
            >
              {index > 0 && (
                <span className="me-opening-and" aria-label="and">
                  &amp;{" "}
                </span>
              )}
              {name}
            </span>
          ))
        ) : (
          <span className="me-opening-name">Our wedding</span>
        )}
      </h2>
      <div className="me-opening-line" aria-hidden="true" />
    </div>
  );
}
