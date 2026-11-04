import { gsap } from "gsap";
import type { WeddingDraft } from "../../../generated/drafts";

export type OpeningVariant = WeddingDraft["entrance"]["variant"];
export type OpeningPhase = "closed" | "opening" | "opened";

interface AnimationScope {
  root: HTMLElement;
  overlay: HTMLElement | null;
  page: HTMLElement;
  complete: () => void;
}

interface OpeningDefinition {
  modal: boolean;
  automatic: boolean;
  animate: (scope: AnimationScope) => gsap.core.Timeline;
}

export const openingRegistry: Record<OpeningVariant, OpeningDefinition> = {
  reveal: {
    modal: false,
    automatic: true,
    animate: ({ page, complete }) =>
      gsap
        .timeline({ onComplete: complete })
        .from(page.querySelectorAll(".me-hero-content > *"), {
          autoAlpha: 0,
          y: 14,
          duration: 0.65,
          stagger: 0.06,
          ease: "power2.out",
        }),
  },
  envelope: {
    modal: true,
    automatic: false,
    animate: ({ root, overlay, complete }) =>
      gsap
        .timeline({ onComplete: complete })
        .to(root.querySelector(".me-envelope-flap"), {
          rotateX: -175,
          duration: 0.65,
          ease: "power2.inOut",
        })
        .set(root.querySelector(".me-envelope-flap"), { zIndex: 0 })
        .to(
          root.querySelector(".me-envelope-card"),
          { yPercent: -48, duration: 0.9, ease: "power2.out" },
          "-=0.05",
        )
        .to(
          root.querySelector(".me-envelope-art"),
          { y: -10, duration: 0.4 },
          "-=0.2",
        )
        .to(overlay, { autoAlpha: 0, duration: 0.5 }, "+=0.2"),
  },
  typography: {
    modal: true,
    automatic: true,
    animate: ({ root, overlay, complete }) =>
      gsap
        .timeline({ onComplete: complete })
        .from(root.querySelectorAll(".me-opening-name"), {
          autoAlpha: 0,
          y: 16,
          stagger: 0.15,
          duration: 0.65,
          ease: "power2.out",
        })
        .from(
          root.querySelector(".me-opening-line"),
          { scaleX: 0, duration: 0.6, transformOrigin: "center" },
          0.15,
        )
        .to(overlay, { autoAlpha: 0, duration: 0.4 }, 1.15),
  },
};
