import { useCallback, useEffect, useRef, type RefObject } from "react";
import confetti from "canvas-confetti";

/** Adapted from the official Realistic Look's layered emissions, with paired origins. */
export function useConfetti(
  root: RefObject<HTMLDivElement | null>,
  canvas: RefObject<HTMLCanvasElement | null>,
  disabled: boolean,
  colors: readonly string[],
) {
  const instance = useRef<confetti.CreateTypes | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const generation = useRef(0);
  const bursts = useRef(0);
  const disabledNow = useRef(disabled);
  disabledNow.current = disabled;

  const reset = useCallback(() => {
    generation.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    instance.current?.reset();
    if (canvas.current) {
      canvas.current.dataset.burstActive = "false";
    }
  }, [canvas]);

  useEffect(() => {
    if (!canvas.current) {
      return;
    }
    try {
      instance.current = confetti.create(canvas.current, {
        resize: true,
        useWorker: false,
        disableForReducedMotion: true,
      });
    } catch {
      instance.current = null;
    }
    return () => {
      reset();
      instance.current = null;
    };
  }, [canvas, reset]);
  useEffect(() => {
    if (disabled) {
      reset();
    }
  }, [disabled, reset]);
  useEffect(() => {
    const suspend = () => {
      if (document.hidden) {
        reset();
      }
    };
    document.addEventListener("visibilitychange", suspend);
    return () => document.removeEventListener("visibilitychange", suspend);
  }, [reset]);

  const burst = useCallback(() => {
    if (
      disabledNow.current ||
      document.hidden ||
      !instance.current ||
      !canvas.current
    ) {
      return;
    }
    reset();
    const token = generation.current;
    const element = canvas.current;
    bursts.current++;
    element.dataset.bursts = String(bursts.current);
    element.dataset.burstActive = "true";
    const mobile = innerWidth < 600;
    const count = mobile ? 42 : 86;
    const rectangle = root.current
      ?.querySelector(".celebration-stage")
      ?.getBoundingClientRect();
    const y = rectangle
      ? Math.min(
          0.92,
          Math.max(
            0.55,
            (rectangle.top +
              Math.min(rectangle.height * 0.82, innerHeight * 0.83)) /
              innerHeight,
          ),
        )
      : 0.84;
    const layers = [
      {
        ratio: 0.25,
        spread: 26,
        startVelocity: mobile ? 31 : 49,
        scalar: 0.8,
        decay: 0.91,
      },
      {
        ratio: 0.2,
        spread: 60,
        startVelocity: mobile ? 26 : 40,
        scalar: 1,
        decay: 0.9,
      },
      {
        ratio: 0.35,
        spread: 100,
        startVelocity: mobile ? 24 : 36,
        scalar: 0.7,
        decay: 0.91,
      },
      { ratio: 0.1, spread: 120, startVelocity: 22, scalar: 1.1, decay: 0.92 },
      {
        ratio: 0.1,
        spread: 100,
        startVelocity: mobile ? 29 : 44,
        scalar: 0.85,
        decay: 0.92,
      },
    ];
    function emit(side: "left" | "right") {
      if (
        generation.current !== token ||
        disabledNow.current ||
        document.hidden
      ) {
        return;
      }
      const promises = layers.map((layer) =>
        instance.current!({
          ...layer,
          particleCount: Math.max(1, Math.floor(count * layer.ratio)),
          angle: side === "left" ? 63 : 117,
          origin: { x: side === "left" ? 0.06 : 0.94, y },
          colors: Array.from(colors),
          shapes: ["square"],
          flat: false,
          ticks: 165,
          gravity: 1.05,
          drift: side === "left" ? 0.1 : -0.1,
          disableForReducedMotion: true,
        }),
      );
      void Promise.all(promises).then(() => {
        if (generation.current === token && side === "right") {
          element.dataset.burstActive = "false";
        }
      });
    }
    try {
      emit("left");
      timers.current.push(setTimeout(() => emit("right"), 110));
    } catch {
      reset();
    }
  }, [canvas, colors, reset, root]);
  return { burst, reset };
}
