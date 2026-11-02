import { useEffect, useRef } from "react";

/** Quiet ambient light only. All celebratory bursts belong to canvas-confetti. */
export function Effects({
  paused,
  reduced,
  color,
}: {
  paused: boolean;
  reduced: boolean;
  color: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element || reduced) {
      return;
    }
    let drawing: CanvasRenderingContext2D | null;
    try {
      drawing = element.getContext("2d");
    } catch {
      return;
    }
    if (!drawing) {
      return;
    }
    const context = drawing;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let lastScroll = window.scrollY;
    let lastGlitter = 0;
    let glitter: Array<{
      x: number;
      y: number;
      life: number;
      duration: number;
      size: number;
    }> = [];
    let visible = true;
    let disposed = false;
    const mobile = innerWidth < 600;
    function resize() {
      width = element!.clientWidth;
      height = element!.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      element!.width = Math.round(width * ratio);
      element!.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function draw(timestamp: number) {
      frame = 0;
      if (disposed || paused || !visible || document.hidden) {
        return;
      }
      if (timestamp - last < 32) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const delta = Math.min((timestamp - (last || timestamp)) / 1000, 0.05);
      last = timestamp;
      elapsed += delta;
      context.clearRect(0, 0, width, height);
      if (width && height) {
        for (let index = 0; index < (mobile ? 20 : 40); index++) {
          const x =
            (((index * 139.7 + Math.sin(elapsed * 0.15 + index) * 12) % width) +
              width) %
            width;
          const y =
            (index * 113.3 - elapsed * (3 + (index % 3)) + height * 10) %
            height;
          context.globalAlpha =
            0.12 + (Math.sin(elapsed * 0.4 + index) + 1) * 0.12;
          context.fillStyle = color;
          context.beginPath();
          context.arc(x, y, index % 4 === 0 ? 1.5 : 0.75, 0, Math.PI * 2);
          context.fill();
        }
      }
      glitter = glitter.filter((point) => point.life > 0);
      for (const point of glitter) {
        point.life -= delta;
        point.y -= delta * 7;
        const progress = Math.max(0, 1 - point.life / point.duration);
        context.globalAlpha = Math.sin(progress * Math.PI) * 0.75;
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 5;
        context.beginPath();
        context.moveTo(point.x, point.y - point.size * 2);
        context.lineTo(point.x + point.size * 0.45, point.y - point.size * 0.4);
        context.lineTo(point.x + point.size * 1.7, point.y);
        context.lineTo(point.x + point.size * 0.45, point.y + point.size * 0.4);
        context.lineTo(point.x, point.y + point.size * 2);
        context.lineTo(point.x - point.size * 0.45, point.y + point.size * 0.4);
        context.lineTo(point.x - point.size * 1.7, point.y);
        context.lineTo(point.x - point.size * 0.45, point.y - point.size * 0.4);
        context.closePath();
        context.fill();
      }
      context.shadowBlur = 0;
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    }
    function synchronize() {
      if (paused || document.hidden || !visible) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame && !disposed) {
        last = 0;
        frame = requestAnimationFrame(draw);
      }
      element!.dataset.running = String(Boolean(frame));
    }
    function scatterGlitter() {
      const now = performance.now();
      const distance = Math.abs(window.scrollY - lastScroll);
      lastScroll = window.scrollY;
      if (
        paused ||
        document.hidden ||
        distance < 5 ||
        now - lastGlitter < 75 ||
        element!.parentElement?.dataset.opened !== "true"
      ) {
        return;
      }
      lastGlitter = now;
      const count = mobile ? 6 : 10;
      for (let index = 0; index < count; index++) {
        const seed = now * 0.017 + index * 137.2;
        const duration = 0.65 + (index % 4) * 0.12;
        glitter.push({
          x:
            width *
            (index % 2 ? 0.81 + (seed % 12) / 100 : 0.05 + (seed % 12) / 100),
          y: height * (0.1 + (seed % 80) / 100),
          life: duration,
          duration,
          size: 1.1 + (index % 3),
        });
      }
      glitter = glitter.slice(-(mobile ? 24 : 42));
    }
    window.addEventListener("scroll", scatterGlitter, { passive: true });
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      synchronize();
    });
    observer.observe(element.parentElement!);
    const size = new ResizeObserver(resize);
    size.observe(element);
    document.addEventListener("visibilitychange", synchronize);
    resize();
    synchronize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      size.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
      window.removeEventListener("scroll", scatterGlitter);
      glitter = [];
      context.clearRect(0, 0, width, height);
      element.dataset.running = "false";
    };
  }, [paused, reduced, color]);
  return (
    <canvas
      ref={canvas}
      className="celebration-canvas"
      aria-hidden="true"
      data-running="false"
    />
  );
}
