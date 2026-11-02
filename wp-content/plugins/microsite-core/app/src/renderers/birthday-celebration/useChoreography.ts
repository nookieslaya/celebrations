import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function useMotionPreference() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useChoreography(
  root: RefObject<HTMLDivElement | null>,
  opened: boolean,
  reduced: boolean,
) {
  useLayoutEffect(() => {
    if (root.current && opened && reduced) {
      root.current.dataset.revealState = "complete";
    }
    if (!root.current || reduced || !opened) {
      return;
    }
    let context: gsap.Context | undefined;
    try {
      gsap.registerPlugin(ScrollTrigger);
      context = gsap.context(() => {
        gsap.from(".celebration-sparkler i", {
          scaleY: 0,
          opacity: 0,
          duration: 1.1,
          stagger: 0.16,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".celebration-sparkler",
            start: "top 90%",
            once: true,
          },
        });
        gsap.utils
          .toArray<HTMLElement>(".celebration-enter")
          .forEach((element) => {
            gsap.from(element, {
              y: 24,
              opacity: 0,
              duration: 0.85,
              scrollTrigger: { trigger: element, start: "top 94%", once: true },
            });
          });
      }, root);
    } catch {
      context?.revert();
      root.current
        ?.querySelectorAll<HTMLElement>(
          ".celebration-name, .celebration-age, .celebration-hero-copy, .celebration-balloons, .celebration-enter, .celebration-sparkler i",
        )
        .forEach((element) => {
          element.style.removeProperty("opacity");
          element.style.removeProperty("transform");
          element.style.removeProperty("visibility");
        });
      if (root.current) {
        root.current.dataset.revealState = "complete";
      }
      // Animation is progressive enhancement. The underlying layout stays readable.
    }
    return () => context?.revert();
  }, [root, opened, reduced]);
}
