import type { CelebrationCopy } from "./copy";
import { Star } from "./Decorations";

/** Separate planes keep the card behind the pocket and the open flap behind it. */
export function Envelope({
  name,
  age,
  copy,
}: {
  name: string;
  age?: number;
  copy: CelebrationCopy;
}) {
  const nameSize =
    Array.from(name).length > 45
      ? "17px"
      : Array.from(name).length > 24
        ? "24px"
        : "43px";
  return (
    <div className="invitation-envelope-layout" aria-hidden="true">
      <div className="invitation-envelope-shadow" />
      <div className="invitation-envelope-motion">
        <div className="invitation-envelope-back" />
        <div className="invitation-envelope-liner" />
        <div className="invitation-envelope-card" data-part="card">
          <span className="invitation-card-eyebrow">{copy.cardEyebrow}</span>
          <span className="invitation-card-name" style={{ fontSize: nameSize }}>
            {name}
          </span>
          <span className="invitation-card-occasion">
            {age === undefined
              ? copy.cardNoAge
              : copy.cardOccasion}
          </span>
          <span className="invitation-card-rule">
            <Star />
          </span>
        </div>
        <div className="invitation-envelope-pocket">
          <div className="invitation-envelope-fold invitation-envelope-fold-left" />
          <div className="invitation-envelope-fold invitation-envelope-fold-right" />
          <div className="invitation-envelope-fold invitation-envelope-fold-bottom" />
          <span className="invitation-envelope-recipient">
            {copy.envelopeRecipient}
          </span>
          <span className="invitation-envelope-imprint">
            {copy.collection}
          </span>
        </div>
        <div className="invitation-envelope-flap-layer">
          <div className="invitation-envelope-flap-hinge">
            <div className="invitation-envelope-flap-face invitation-envelope-flap-front" />
            <div className="invitation-envelope-flap-face invitation-envelope-flap-back" />
          </div>
        </div>
        <div className="invitation-envelope-seal">
          <div>
            <Star />
            <span>{copy.seal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
