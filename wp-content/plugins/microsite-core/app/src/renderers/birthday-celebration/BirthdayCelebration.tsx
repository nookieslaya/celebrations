import { InvitationAssetGate } from "../../components/InvitationLoader";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PreviewContext } from "../../preview/protocol";
import { formatEvent } from "../event-display";
import type { BirthdayInvitationDraft } from "../../generated/drafts";
import { Decorations, Star } from "./Decorations";
import { Effects } from "./Effects";
import { resolveCelebrationCopy } from "./copy";
import { Envelope } from "./Envelope";
import { useInvitationIntro } from "./useInvitationIntro";
import { useConfetti } from "./useConfetti";
import { celebrationPalettes, type CelebrationPalette } from "./palettes";
import { useChoreography, useMotionPreference } from "./useChoreography";
import "./celebration.css";
import "./envelope.css";

function InvitationArrow({
  direction = "diagonal",
}: {
  direction?: "diagonal" | "down";
}) {
  return (
    <svg
      className={`celebration-arrow celebration-arrow-${direction}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 19 19 5M5 5h14v14" />
    </svg>
  );
}

function BirthdayCelebration({
  value,
  rsvp,
  rsvpAvailable = false,
  preview = false,
  previewContext,
  introKey,
}: {
  value: BirthdayInvitationDraft;
  rsvp?: ReactNode;
  rsvpAvailable?: boolean;
  preview?: boolean;
  previewContext?: PreviewContext;
  introKey?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const details = useRef<HTMLElement>(null);
  const confettiCanvas = useRef<HTMLCanvasElement>(null);
  const reduced = useMotionPreference();
  const [paused, setPaused] = useState(false);
  const motionPaused = paused || previewContext?.active === false;
  const palette =
    value.appearance.palette in celebrationPalettes
      ? (value.appearance.palette as CelebrationPalette)
      : "midnight-gold";
  const theme = celebrationPalettes[palette];
  const content = value.content;
  const age =
    Number.isInteger(content.age) &&
    Number(content.age) >= 1 &&
    Number(content.age) <= 120
      ? content.age
      : undefined;
  const copy = resolveCelebrationCopy(content, theme.name);
  const name = content.celebrantName.trim() || "Your celebration";
  const dateLabel =
    formatEvent(
      content.event,
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
      preview,
    ) ?? "A date to remember";
  const timeLabel =
    formatEvent(
      content.event,
      {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      },
      preview,
    ) ?? "Details coming soon";

  const confetti = useConfetti(
    root,
    confettiCanvas,
    motionPaused || reduced,
    theme.confetti,
  );
  const intro = useInvitationIntro({
    root,
    cover,
    heading,
    details,
    reduced,
    preview,
    initiallyOpen: previewContext?.initiallyOpen ?? false,
    replayToken: previewContext?.replay ?? 0,
    projectKey: introKey ?? window.location.pathname,
    burst: confetti.burst,
    resetBurst: confetti.reset,
  });
  const opened = intro.state === "opened";
  useChoreography(root, opened, reduced);

  useEffect(() => {
    const element = root.current;
    if (!element || !stage.current) {
      return;
    }
    let visible = true;
    const synchronize = () => {
      element.dataset.decorationsActive = String(
        visible && !document.hidden && !motionPaused && !reduced,
      );
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      synchronize();
    });
    observer.observe(stage.current);
    document.addEventListener("visibilitychange", synchronize);
    synchronize();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [motionPaused, reduced]);
  return (
    <div
      ref={root}
      className="celebration"
      data-palette={palette}
      data-opened={opened}
      data-intro-state={intro.state}
      data-reveal-state={opened ? "complete" : intro.state}
      data-reduced={reduced}
      data-paused={motionPaused}
    >
      <Effects paused={motionPaused} reduced={reduced} color={theme.accent} />
      <canvas
        ref={confettiCanvas}
        className="celebration-confetti"
        aria-hidden="true"
        data-burst-active="false"
      />
      <div className="celebration-masthead">
        <span className="celebration-monogram" aria-hidden="true">
          {copy.seal.toLowerCase()}.
        </span>
        <span>{copy.collection}</span>
        <span className="celebration-edition">{copy.editionLabel}</span>
      </div>
      <button
        className="celebration-pause"
        aria-pressed={paused}
        disabled={reduced}
        onClick={() => setPaused(!paused)}
      >
        {reduced
          ? copy.reducedLabel
          : paused
            ? copy.resumeButton
            : copy.pauseButton}
        <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
      </button>
      {preview && previewContext?.mode !== "live" && opened && !reduced && (
        <button
          className="celebration-replay celebration-text-button"
          onClick={intro.replay}
        >
          {copy.replayButton}
        </button>
      )}
      <section
        ref={stage}
        className="celebration-stage"
        aria-label="Birthday invitation"
      >
        <Decorations />
        <div
          ref={cover}
          className="celebration-cover"
          aria-hidden={opened}
          inert={opened}
        >
          <div className="celebration-aurora" aria-hidden="true">
            <span />
            <span />
            <span />
            <i className="celebration-aurora-dust" />
          </div>
          <p className="celebration-eyebrow">{copy.introEyebrow}</p>
          <Envelope name={name} age={age} copy={copy} />
          <h1>
            {copy.introTitle}
            <br />
            <em>{copy.introAccent}</em>
          </h1>
          <p>{copy.introDescription}</p>
          <button
            className="celebration-button"
            disabled={intro.state === "opening"}
            onClick={intro.open}
          >
            <span>{copy.openButton}</span>
            <span className="celebration-button-icon">
              <InvitationArrow />
            </span>
          </button>
          <button className="celebration-text-button" onClick={intro.skip}>
            {copy.skipButton} <InvitationArrow direction="down" />
          </button>
        </div>
        <div
          className="celebration-hero"
          data-covered={intro.state === "closed"}
          aria-hidden={!opened}
          inert={!opened}
        >
          <p className="celebration-eyebrow celebration-hero-copy">
            {copy.heroEyebrow}
          </p>
          <h1 ref={heading} tabIndex={-1} className="celebration-name">
            {name}
          </h1>
          {age !== undefined && (
            <div className="celebration-age-wrap">
              <span className="celebration-eyebrow">{copy.turning}</span>
              <div className="celebration-age" data-digits={String(age).length}>
                {age}
              </div>
              <span className="celebration-age-caption">{copy.ageCaption}</span>
            </div>
          )}
          <h2 className="celebration-hero-copy celebration-tagline">
            {content.heading}
          </h2>
          <p className="celebration-hero-copy celebration-date-line">
            {dateLabel}
          </p>
          <a
            className="celebration-button celebration-hero-copy"
            href={rsvpAvailable ? "#celebration-rsvp" : "#celebration-details"}
          >
            <span>
              {rsvpAvailable ? copy.replyButton : copy.discoverButton}
            </span>
            <span className="celebration-button-icon">
              <InvitationArrow direction="down" />
            </span>
          </a>
          <a
            className="celebration-text-button celebration-details-link"
            href="#celebration-details"
          >
            {copy.detailsLink} <InvitationArrow direction="down" />
          </a>
        </div>
      </section>
      <div
        className="celebration-content"
        hidden={!opened}
        inert={!opened}
        aria-hidden={!opened}
      >
        <section
          className="celebration-story celebration-enter"
          aria-labelledby="celebration-story-heading"
        >
          <div className="celebration-rule">
            <Star />
          </div>
          <p className="celebration-eyebrow">{copy.storyEyebrow}</p>
          <h2 id="celebration-story-heading">
            {copy.storyTitle}
            <br />
            <em>{copy.storyAccent}</em>
          </h2>
          <p className="celebration-story-copy">{content.message}</p>
          <span className="celebration-story-signature">{copy.signature}</span>
        </section>
        <section
          ref={details}
          id="celebration-details"
          tabIndex={-1}
          className="celebration-details celebration-enter"
          aria-labelledby="celebration-details-heading"
        >
          <p className="celebration-eyebrow">{copy.detailsEyebrow}</p>
          <h2 id="celebration-details-heading">
            {copy.detailsTitle} <em>{copy.detailsAccent}</em>
          </h2>
          <div className="celebration-details-grid">
            <div>
              <span className="celebration-detail-number">
                {copy.whenLabel}
              </span>
              <h3>{dateLabel}</h3>
              <p>{timeLabel}</p>
              <small>{content.event.timeZone}</small>
            </div>
            <div>
              <span className="celebration-detail-number">
                {copy.whereLabel}
              </span>
              <h3>{content.venueName || "Somewhere special"}</h3>
              <p>{content.address || "The address will be shared soon."}</p>
              {content.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.directionsLink} <InvitationArrow />
                </a>
              )}
            </div>
          </div>
          {(content.dressCode || content.additionalInfo) && (
            <div className="celebration-notes">
              {content.dressCode && (
                <div>
                  <span className="celebration-eyebrow">{copy.dressLabel}</span>
                  <p>{content.dressCode}</p>
                </div>
              )}
              {content.additionalInfo && (
                <div>
                  <span className="celebration-eyebrow">{copy.extraLabel}</span>
                  <p>{content.additionalInfo}</p>
                </div>
              )}
            </div>
          )}
        </section>
        <section
          id="celebration-rsvp"
          className="celebration-rsvp"
          aria-label="Your reply"
        >
          <div className="celebration-rule">
            <Star />
          </div>
          <p className="celebration-eyebrow">{copy.rsvpEyebrow}</p>
          <h2>
            {copy.rsvpTitle} <em>{copy.rsvpAccent}</em>
          </h2>
          {rsvp ?? (
            <p className="celebration-rsvp-notice">
              {content.rsvp?.enabled
                ? "Private preview · RSVP is available on the published invitation. No responses can be sent from this preview."
                : "RSVP is not enabled for this invitation."}
            </p>
          )}
        </section>
        <footer className="celebration-closing">
          <div className="celebration-sparkler" aria-hidden="true">
            <Star />
            <i />
            <i />
            <i />
            <i />
          </div>
          <p>
            {copy.closingTitle}
            <br />
            <em>{copy.closingAccent}</em>
          </p>
          <span className="celebration-eyebrow">{copy.closingEyebrow}</span>
          {!reduced && (
            <button
              className="celebration-text-button"
              disabled={paused}
              onClick={confetti.burst}
            >
              {copy.celebrateButton} <span aria-hidden="true">✧</span>
            </button>
          )}
          <div className="celebration-footer-line">
            <span>
              {name} {age !== undefined ? `· ${age}` : ""}
            </span>
            <Star />
            <span>{copy.editionLabel}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function LoadedInvitation(
  props: Parameters<typeof BirthdayCelebration>[0],
) {
  return (
    <InvitationAssetGate
      templateId="birthday-celebration"
      palette={props.value.appearance.palette}
    >
      <BirthdayCelebration {...props} />
    </InvitationAssetGate>
  );
}
