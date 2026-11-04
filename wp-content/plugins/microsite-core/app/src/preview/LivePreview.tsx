import { useEffect, useState } from "react";
import { getRenderer } from "../renderers/registry";
import { RendererFrame } from "./RendererFrame";
import type { PreviewDocument, PreviewMode } from "./protocol";

export function LivePreview({
  document,
  mobileVisible,
  mode = "live",
}: {
  document: PreviewDocument;
  mobileVisible: boolean;
  mode?: PreviewMode;
}) {
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  const [replay, setReplay] = useState(0);
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 950px)").matches,
  );
  const definition = getRenderer(document.templateId, document.templateVersion);
  useEffect(() => {
    const media = matchMedia("(max-width: 950px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <section className="live-preview-panel" aria-label="Visual preview">
      <p className="live-preview-label">
        {mode === "demo"
          ? "Demonstration — no project is created"
          : "Live preview — changes are not published"}
      </p>
      <div className="live-preview-controls">
        <div role="group" aria-label="Preview viewport">
          <button
            type="button"
            className="button"
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            Mobile
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            Desktop
          </button>
        </div>
        {definition?.supportsOpening && (
          <button
            className="button"
            type="button"
            onClick={() => setReplay((current) => current + 1)}
          >
            Replay opening
          </button>
        )}
      </div>
      <RendererFrame
        document={document}
        mode={mode}
        viewport={viewport}
        replay={replay}
        active={!narrow || mobileVisible}
      />
    </section>
  );
}
