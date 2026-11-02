import { InvitationAssetGate } from "../../components/InvitationLoader";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { BirthdayInvitationDraft } from "../../generated/drafts";
import "./party.css";

const words = {
  intro: "You’re invited",
  open: "Open invitation",
  skip: "Skip intro",
  details: "Jump to details",
  birthday: "A BIRTHDAY. A WHOLE MOOD.",
  date: "When",
  venue: "Where",
  dress: "The dress code",
  extra: "One more thing",
  dateTba: "Date to be announced",
  venueTba: "A place worth gathering",
  addressTba: "The address is coming soon.",
  map: "Find the party",
  final: "See you on the dance floor.",
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

function BirthdayParty({ value }: { value: BirthdayInvitationDraft }) {
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(reduced);
  const root = useRef<HTMLDivElement>(null);
  const revealHeading = useRef<HTMLHeadingElement>(null);
  const details = useRef<HTMLElement>(null);
  const skipAnimation = useRef(false);
  const confettiRequested = useRef(false);
  const confettiPlayed = useRef(false);
  const focusTarget = useRef<"reveal" | "details" | null>(null);
  const content = value.content;
  const name = content.celebrantName.trim() || "Your name here";
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const nameWords = name
    .split(/\s+/)
    .map((word) =>
      Array.from(segmenter.segment(word), (segment) => segment.segment),
    );
  const date = content.event.startsAt
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: content.event.timeZone,
      }).format(new Date(content.event.startsAt))
    : words.dateTba;

  useEffect(() => {
    if (reduced) {
      setOpened(true);
    }
  }, [reduced]);

  useEffect(() => {
    if (!opened || !focusTarget.current) {
      return;
    }
    const target =
      focusTarget.current === "details"
        ? details.current
        : revealHeading.current;
    target?.focus({ preventScroll: true });
    if (focusTarget.current === "details") {
      target?.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      root.current?.scrollIntoView({ behavior: "auto", block: "start" });
    }
    focusTarget.current = null;
  }, [opened]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) {
      return;
    }
    let media: ReturnType<typeof gsap.matchMedia> | null = null;
    try {
      gsap.registerPlugin(ScrollTrigger);
      media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          if (skipAnimation.current) {
            return;
          }
          if (!opened) {
            gsap.to(".party-intro-decoration", {
              y: -16,
              rotation: "+=9",
              duration: 2.4,
              stagger: 0.3,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });
            return;
          }
          const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
          entrance.from(".party-kicker", { y: 18, opacity: 0, duration: 0.55 });
          entrance.from(
            ".party-letter",
            {
              yPercent: 55,
              rotation: 7,
              opacity: 0,
              duration: 0.7,
              stagger: 0.018,
            },
            "-=0.25",
          );
          entrance.from(
            ".party-age",
            { scale: 0.8, rotation: -14, opacity: 0, duration: 0.6 },
            "-=0.4",
          );
          if (confettiRequested.current && !confettiPlayed.current) {
            confettiPlayed.current = true;
            gsap.fromTo(
              ".party-confetti-piece",
              { y: -20, x: 0, opacity: 1 },
              {
                y: () => Math.min(window.innerHeight, 1000),
                x: (index) => Math.sin(index * 2.4) * 130,
                rotation: (index) => index * 137,
                opacity: 0,
                duration: 1.8,
                stagger: 0.008,
                ease: "power2.out",
              },
            );
          }
          element.querySelectorAll(".party-scroll-reveal").forEach((block) => {
            gsap.from(block, {
              y: 32,
              opacity: 0,
              duration: 0.75,
              ease: "power2.out",
              scrollTrigger: { trigger: block, start: "top 92%", once: true },
            });
          });
          ScrollTrigger.refresh();
        },
        element,
      );
    } catch {
      media?.revert();
      // Animation is enhancement: partial initialization must never hide real content.
      element
        .querySelectorAll<HTMLElement>(
          ".party-letter, .party-kicker, .party-age, .party-scroll-reveal",
        )
        .forEach((node) => {
          node.style.removeProperty("opacity");
          node.style.removeProperty("transform");
          node.style.removeProperty("visibility");
        });
    }
    return () => media?.revert();
  }, [opened, reduced]);

  function open(skip = false, target: "reveal" | "details" = "reveal") {
    skipAnimation.current = skip;
    confettiRequested.current = !skip;
    focusTarget.current = target;
    if (opened) {
      const node =
        target === "details" ? details.current : revealHeading.current;
      node?.focus({ preventScroll: true });
      node?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      focusTarget.current = null;
    } else {
      setOpened(true);
    }
  }

  return (
    <div
      className="party"
      data-palette={value.appearance.palette}
      data-opened={opened}
      data-motion={reduced ? "reduced" : "full"}
      ref={root}
    >
      <a
        className="party-details-shortcut"
        href="#party-details"
        onClick={(event) => {
          event.preventDefault();
          open(true, "details");
        }}
      >
        {words.details} ↘
      </a>
      {!opened && (
        <section className="party-intro" aria-labelledby="party-intro-title">
          <span className="party-micro-label">
            THE GOOD TIMES DEPARTMENT / 001
          </span>
          <div className="party-intro-art" aria-hidden="true">
            <span className="party-sticker party-intro-decoration">✳</span>
            <span className="party-ring party-intro-decoration" />
            <span className="party-squiggle party-intro-decoration">〰</span>
          </div>
          <h1 id="party-intro-title">
            YOU’RE
            <br />
            <span>INVITED.</span>
          </h1>
          <p>Something good is about to happen.</p>
          <button className="party-open" onClick={() => open()}>
            {words.open}
            <span aria-hidden="true">↗</span>
          </button>
          <button className="party-skip" onClick={() => open(true)}>
            {words.skip} <span aria-hidden="true">→</span>
          </button>
          <span className="party-intro-foot">
            GOOD PEOPLE. BIG ENERGY. YOUR INVITATION INSIDE.
          </span>
        </section>
      )}
      {opened && (
        <div className="party-scenes">
          <section className="party-reveal" aria-label="Birthday reveal">
            <div className="party-hero-lines" aria-hidden="true" />
            <div className="party-confetti" aria-hidden="true">
              {!reduced &&
                !skipAnimation.current &&
                Array.from({ length: 42 }, (_, index) => (
                  <span
                    key={index}
                    className="party-confetti-piece"
                    style={{
                      left: `${(index * 47) % 100}%`,
                      background:
                        index % 3 === 0
                          ? "var(--party-accent)"
                          : index % 3 === 1
                            ? "var(--party-ink)"
                            : "var(--party-paper)",
                    }}
                  />
                ))}
            </div>
            <p className="party-kicker">{words.birthday}</p>
            <div className="party-name-lockup">
              <span className="party-spark" aria-hidden="true">
                ✳
              </span>
              <h1
                className={`party-name${name.length > 28 ? " is-long" : ""}`}
                aria-label={name}
                tabIndex={-1}
                ref={revealHeading}
              >
                <span aria-hidden="true">
                  {nameWords.map((word, wordIndex) => (
                    <Fragment key={wordIndex}>
                      <span className="party-name-word">
                        {word.map((letter, index) => (
                          <span className="party-letter" key={index}>
                            {letter}
                          </span>
                        ))}
                      </span>
                      {wordIndex < nameWords.length - 1 ? " " : null}
                    </Fragment>
                  ))}
                </span>
              </h1>
              {content.age !== undefined && (
                <div className="party-age">
                  <span>TURNING</span>
                  <strong>{content.age}</strong>
                </div>
              )}
            </div>
            <div className="party-hero-bottom">
              <span>LET’S MAKE IT A NIGHT.</span>
              <span aria-hidden="true">↓</span>
              <span>SCROLL FOR THE GOOD STUFF.</span>
            </div>
          </section>
          <div className="party-ticker" aria-hidden="true">
            <span>
              MORE LIFE ✳ MORE LAUGHS ✳ MORE MEMORIES ✳ MORE LIFE ✳ MORE
              LAUGHS ✳ MORE MEMORIES ✳
            </span>
          </div>
          <section className="party-invitation" aria-label="Invitation">
            <div className="party-section-number">01 / THE INVITATION</div>
            <div className="party-scroll-reveal">
              <h2>{content.heading || "Good people. Great night."}</h2>
              <p>
                {content.message ||
                  "The best moments are the ones we share. More details soon."}
              </p>
            </div>
            <span className="party-invitation-star" aria-hidden="true">
              ✴
            </span>
          </section>
          <section
            className="party-details"
            id="party-details"
            aria-labelledby="party-details-title"
            tabIndex={-1}
            ref={details}
          >
            <div className="party-section-number">02 / SAVE THE SPOT</div>
            <h2 id="party-details-title" className="party-scroll-reveal">
              THE PLAN<span aria-hidden="true">↘</span>
            </h2>
            <div className="party-ticket party-scroll-reveal">
              <div className="party-ticket-label">
                ADMIT ONE · GOOD ENERGY ONLY
              </div>
              <div className="party-ticket-grid">
                <div>
                  <h3>{words.date}</h3>
                  <p className="party-date">{date}</p>
                  <small>{content.event.timeZone.replaceAll("_", " ")}</small>
                </div>
                <div>
                  <h3>{words.venue}</h3>
                  <p>{content.venueName || words.venueTba}</p>
                  <address>{content.address || words.addressTba}</address>
                </div>
              </div>
              <div className="party-ticket-stub">
                <span aria-hidden="true">✳</span>
                <span>YOU + THE PEOPLE YOU LOVE</span>
              </div>
            </div>
            {(content.dressCode?.trim() || content.additionalInfo?.trim()) && (
              <div className="party-extras party-scroll-reveal">
                {content.dressCode?.trim() && (
                  <div>
                    <h3>{words.dress}</h3>
                    <p>{content.dressCode}</p>
                  </div>
                )}
                {content.additionalInfo?.trim() && (
                  <div>
                    <h3>{words.extra}</h3>
                    <p>{content.additionalInfo}</p>
                  </div>
                )}
              </div>
            )}
          </section>
          <section className="party-closing" aria-label="Closing">
            <span className="party-section-number">
              03 / JUST BRING YOURSELF
            </span>
            <div className="party-scroll-reveal">
              <h2>{words.final}</h2>
              {content.address.trim() && (
                <a
                  className="party-map"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {words.map} ↗
                </a>
              )}
            </div>
            <div className="party-closing-sign">
              <span aria-hidden="true">✳</span>
              <span>
                MADE FOR A NIGHT
                <br />
                WORTH REMEMBERING.
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function LoadedInvitation(
  props: Parameters<typeof BirthdayParty>[0],
) {
  return (
    <InvitationAssetGate
      templateId="birthday-party"
      palette={props.value.appearance.palette}
    >
      <BirthdayParty {...props} />
    </InvitationAssetGate>
  );
}
