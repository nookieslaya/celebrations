import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { gsap } from "gsap";
import type { WeddingDraft } from "../../../generated/drafts";
import type { PreviewContext } from "../../../preview/protocol";
import { OpeningArtwork } from "./OpeningArtwork";
import { openingRegistry, type OpeningPhase } from "./registry";
import "./opening.css";

export function WeddingOpening({
  value,
  mediaToken,
  context,
  locale,
  children,
}: {
  value: WeddingDraft;
  mediaToken: string;
  context?: PreviewContext;
  locale: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const animation = useRef<gsap.Context | null>(null);
  const focusFrame = useRef<number | null>(null);
  const variant = value.entrance.variant;
  const definition = openingRegistry[variant];
  const replay = context?.replay ?? 0;
  const initiallyOpen = context?.initiallyOpen ?? false;
  const active = context?.active ?? true;
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const [stage, setStage] = useState<{ phase: OpeningPhase; cycle: number }>(
    () => ({
      phase:
        reduced || initiallyOpen
          ? "opened"
          : definition.automatic
            ? "opening"
            : "closed",
      cycle: replay,
    }),
  );
  const phase = useRef(stage.phase);
  phase.current = stage.phase;
  const modal = definition.modal && stage.phase !== "opened" && !reduced;
  const contentToken = JSON.stringify(value) + mediaToken;
  const lastContent = useRef(contentToken);

  const finish = useCallback((focus = false) => {
    try {
      timeline.current?.eventCallback("onComplete", null);
      animation.current?.revert();
      timeline.current?.kill();
    } catch {
      // A failed cleanup must still leave readable content and dismiss the modal.
      page.current
        ?.querySelectorAll<HTMLElement>(".me-hero-content > *")
        .forEach((element) => {
          element.style.removeProperty("opacity");
          element.style.removeProperty("visibility");
          element.style.removeProperty("transform");
        });
    }
    animation.current = null;
    timeline.current = null;
    phase.current = "opened";
    setStage((current) =>
      current.phase === "opened" ? current : { ...current, phase: "opened" },
    );
    if (focus) {
      if (focusFrame.current !== null) {
        window.cancelAnimationFrame(focusFrame.current);
      }
      focusFrame.current = window.requestAnimationFrame(() => {
        const heading = page.current?.querySelector("h1");
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
        focusFrame.current = null;
      });
    }
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const next: OpeningPhase =
      reducedRef.current || (initiallyOpen && replay === 0)
        ? "opened"
        : openingRegistry[value.entrance.variant].automatic
          ? "opening"
          : "closed";
    phase.current = next;
    setStage((current) =>
      current.phase === next && current.cycle === replay
        ? current
        : { phase: next, cycle: replay },
    );
    // Only explicit Replay or preview mode changes start an opening; content never does.
  }, [replay, initiallyOpen]);

  useLayoutEffect(() => {
    if (lastContent.current !== contentToken) {
      lastContent.current = contentToken;
      if (stage.cycle === replay && phase.current !== "opened") {
        finish(false);
      }
    }
  }, [contentToken, finish, replay, stage.cycle]);

  useLayoutEffect(() => {
    if (reduced) {
      finish(false);
    }
  }, [reduced, finish]);

  useLayoutEffect(() => {
    if (
      stage.phase !== "opening" ||
      reduced ||
      !root.current ||
      !page.current
    ) {
      return;
    }
    let scope: gsap.Context | undefined;
    try {
      scope = gsap.context(() => {}, root);
      animation.current = scope;
      scope.add(() => {
        timeline.current = definition.animate({
          root: root.current!,
          overlay: overlay.current,
          page: page.current!,
          complete: () => finish(definition.modal),
        });
        timeline.current.paused(!active);
      });
    } catch {
      try {
        scope?.revert();
      } catch {
        /* Content is revealed by finish below. */
      }
      finish(false);
    }
    return () => {
      try {
        scope?.revert();
      } catch {
        /* Unmount/replay must not trap focus or scrolling. */
      }
      if (animation.current === scope) {
        animation.current = null;
        timeline.current = null;
      }
    };
    // Active changes pause the same timeline; data changes finish it through contentToken.
  }, [stage.phase, stage.cycle, reduced, finish]);

  useEffect(() => {
    timeline.current?.paused(!active);
  }, [active]);

  useEffect(() => {
    if (stage.phase !== "opening" || !active) {
      return;
    }
    const timeout = window.setTimeout(() => finish(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [stage.phase, stage.cycle, active, finish]);

  useLayoutEffect(() => {
    if (!modal) {
      return;
    }
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    overlay.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [modal]);

  useEffect(
    () => () => {
      if (focusFrame.current !== null) {
        window.cancelAnimationFrame(focusFrame.current);
      }
    },
    [],
  );

  return (
    <div className="me-opening-root" ref={root} data-phase={stage.phase}>
      <div ref={page} inert={modal} aria-hidden={modal ? true : undefined}>
        {children}
      </div>
      {modal && (
        <div
          className="me-opening-overlay"
          ref={overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="me-opening-heading"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              finish(true);
            } else if (event.key === "Tab") {
              const buttons = [
                ...(overlay.current?.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
                ) ?? []),
              ];
              const first = buttons[0];
              const last = buttons.at(-1);
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <OpeningArtwork variant={variant} value={value} locale={locale} />
          <div className="me-opening-actions">
            {variant === "envelope" && (
              <button
                className="me-button"
                type="button"
                aria-disabled={stage.phase === "opening"}
                onClick={() => {
                  if (phase.current !== "closed") {
                    return;
                  }
                  phase.current = "opening";
                  setStage((current) => ({ ...current, phase: "opening" }));
                }}
              >
                {stage.phase === "opening"
                  ? "Opening invitation…"
                  : "Open invitation"}
              </button>
            )}
            <button
              className="me-skip"
              type="button"
              onClick={() => finish(true)}
            >
              Skip intro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
