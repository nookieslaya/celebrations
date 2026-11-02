import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import { TemplatePreview } from "./preview/TemplatePreview";
import {
  isPreviewUpdate,
  isSignal,
  previewChannel,
  type PreviewUpdate,
} from "./preview/protocol";
import "./public.css";
import "./preview/frame.css";

function Frame() {
  const [update, setUpdate] = useState<PreviewUpdate | null>(null);
  useEffect(() => {
    const origin = window.location.origin;
    const ready = () =>
      window.parent.postMessage(
        { channel: previewChannel, type: "ready" },
        origin,
      );
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== origin ||
        event.source !== window.parent ||
        window.parent === window
      ) {
        return;
      }
      if (isSignal(event.data, "hello")) {
        ready();
      } else if (isPreviewUpdate(event.data)) {
        setUpdate(event.data);
      }
    };
    window.addEventListener("message", receive);
    ready();
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    const active = update?.context.active ?? false;
    document.documentElement.dataset.previewActive = String(active);
    gsap.globalTimeline.paused(!active);
    return () => {
      gsap.globalTimeline.paused(false);
    };
  }, [update?.context.active]);

  useEffect(() => {
    const stopNavigation = (event: MouseEvent) => {
      const target =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (target && !target.getAttribute("href")?.startsWith("#")) {
        event.preventDefault();
      }
    };
    const stopSubmit = (event: SubmitEvent) => event.preventDefault();
    document.addEventListener("click", stopNavigation, true);
    document.addEventListener("submit", stopSubmit, true);
    return () => {
      document.removeEventListener("click", stopNavigation, true);
      document.removeEventListener("submit", stopSubmit, true);
    };
  }, []);

  return update ? (
    <TemplatePreview
      key={`${update.document.templateId}:${update.document.templateVersion}`}
      {...update}
    />
  ) : (
    <p className="frame-loading" role="status">
      Preparing preview…
    </p>
  );
}

const root = document.getElementById("public-root");
if (root) {
  createRoot(root).render(<Frame />);
}
