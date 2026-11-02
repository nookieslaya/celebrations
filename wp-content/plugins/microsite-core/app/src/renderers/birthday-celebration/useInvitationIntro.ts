import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { gsap } from "gsap";

type IntroState = "closed" | "opening" | "opened";
interface IntroOptions {
  root: RefObject<HTMLDivElement | null>;
  cover: RefObject<HTMLDivElement | null>;
  heading: RefObject<HTMLHeadingElement | null>;
  details: RefObject<HTMLElement | null>;
  reduced: boolean;
  preview: boolean;
  initiallyOpen: boolean;
  replayToken: number;
  projectKey: string;
  burst: () => void;
  resetBurst: () => void;
}

export function useInvitationIntro({
  root,
  cover,
  heading,
  details,
  reduced,
  preview,
  initiallyOpen,
  replayToken,
  projectKey,
  burst,
  resetBurst,
}: IntroOptions) {
  const storageKey = `celebration-intro:envelope-v2:${projectKey}`;
  const [state, setState] = useState<IntroState>(() => {
    if (reduced || initiallyOpen) {
      return "opened";
    }
    try {
      if (!preview && sessionStorage.getItem(storageKey) === "skipped") {
        return "opened";
      }
    } catch {
      /* Storage is optional. */
    }
    return "closed";
  });
  const currentState = useRef(state);
  const lastReplay = useRef(0);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const context = useRef<gsap.Context | null>(null);
  const focusTarget = useRef<"hero" | "details" | null>(null);

  const show = useCallback(
    (focus: "hero" | "details" | null) => {
      timeline.current?.kill();
      timeline.current = null;
      context.current?.revert();
      context.current = null;
      if (cover.current) {
        cover.current.style.visibility = "hidden";
      }
      focusTarget.current = focus;
      currentState.current = "opened";
      if (root.current) {
        root.current.dataset.revealState = "complete";
      }
      setState("opened");
    },
    [root],
  );

  useEffect(() => {
    if (reduced) {
      resetBurst();
      show(null);
    }
  }, [reduced, resetBurst, show]);
  useEffect(() => {
    if (state !== "opened" || !focusTarget.current) {
      return;
    }
    const target =
      focusTarget.current === "details" ? details.current : heading.current;
    target?.focus({ preventScroll: true });
    if (focusTarget.current === "details") {
      target?.scrollIntoView({ behavior: "auto", block: "start" });
    }
    focusTarget.current = null;
  }, [state, heading, details]);
  useEffect(() => {
    // Fast Refresh may preserve an opening state after disposing its old timeline.
    if (currentState.current === "opening" && !timeline.current?.isActive()) {
      show("hero");
    }
    return () => {
      timeline.current?.kill();
      context.current?.revert();
      timeline.current = null;
      context.current = null;
    };
  }, [show]);

  useEffect(() => {
    if (replayToken <= lastReplay.current || reduced) {
      return;
    }
    lastReplay.current = replayToken;
    replay();
    const frame = requestAnimationFrame(() => open());
    return () => cancelAnimationFrame(frame);
    // Replay identity is independent of changes to text and palette.
  }, [replayToken]);

  function skip() {
    resetBurst();
    if (!preview) {
      try {
        sessionStorage.setItem(storageKey, "skipped");
      } catch {
        /* No personal data or secrets are stored. */
      }
    }
    show("details");
  }

  function open() {
    if (currentState.current !== "closed") {
      return;
    }
    if (reduced || !root.current || !cover.current) {
      show("hero");
      return;
    }
    currentState.current = "opening";
    setState("opening");
    root.current.dataset.revealState = "opening";
    const scope = root.current;
    const front = cover.current;
    try {
      context.current = gsap.context(() => {
        const hero = scope.querySelector(".celebration-hero");
        const flapLayer = scope.querySelector<HTMLElement>(
          ".invitation-envelope-flap-layer",
        );
        const card = scope.querySelector(".invitation-envelope-card");
        const sequence = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          onComplete: () => show("hero"),
        });
        timeline.current = sequence;
        sequence
          .set(hero, { opacity: 0 })
          .to(
            ".invitation-envelope-seal",
            { y: -7, scale: 1.04, opacity: 0, duration: 0.24 },
            0,
          )
          .to(".invitation-envelope-motion", { y: 3, duration: 0.14 }, 0.04)
          .to(".invitation-envelope-motion", { y: 0, duration: 0.2 }, 0.18)
          .to(
            ".invitation-envelope-flap-hinge",
            { rotateX: -176, duration: 0.67 },
            0.18,
          )
          .to(
            ".invitation-envelope-shadow",
            { scaleX: 1.08, opacity: 0.48, duration: 0.6 },
            0.2,
          )
          .call(
            () => {
              if (flapLayer) {
                flapLayer.style.zIndex = "1";
              }
              front.dataset.phase = "flap";
            },
            [],
            0.54,
          )
          .set(
            ".invitation-envelope-flap-front",
            { visibility: "hidden" },
            0.54,
          )
          .set(
            ".invitation-envelope-flap-back",
            { visibility: "visible" },
            0.54,
          )
          .set(card, { visibility: "visible" }, 0.62)
          .to(card, { yPercent: -70, duration: 0.74, ease: "power3.out" }, 0.7)
          .call(
            () => {
              front.dataset.phase = "card";
            },
            [],
            1.12,
          )
          .to(front, { opacity: 0, duration: 0.65 }, 1.48)
          .to(hero, { opacity: 1, duration: 0.55 }, 1.5)
          .fromTo(
            ".celebration-name",
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.65 },
            1.5,
          )
          .fromTo(
            ".celebration-age",
            { opacity: 0, scale: 0.94 },
            { opacity: 1, scale: 1, duration: 0.65 },
            1.62,
          )
          .fromTo(
            ".celebration-hero-copy",
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
            1.74,
          )
          .call(burst, [], 1.85);
      }, scope);
    } catch {
      show("hero");
    }
  }

  function replay() {
    if (!preview || reduced) {
      return;
    }
    resetBurst();
    timeline.current?.kill();
    context.current?.revert();
    context.current = null;
    cover.current?.style.removeProperty("visibility");
    currentState.current = "closed";
    setState("closed");
    root.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }

  return { state, open, skip, replay };
}
