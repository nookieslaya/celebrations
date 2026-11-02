import { useEffect, useRef, useState } from "react";
import { appBase } from "../config";
import {
  isSignal,
  previewChannel,
  type PreviewDocument,
  type PreviewMode,
  type PreviewUpdate,
} from "./protocol";
import "./preview.css";

export function RendererFrame({
  document,
  mode = "live",
  viewport = "mobile",
  replay = 0,
  active = true,
}: {
  document: PreviewDocument;
  mode?: PreviewMode;
  viewport?: "mobile" | "desktop" | "fluid";
  replay?: number;
  active?: boolean;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(390);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(!window.document.hidden);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const width =
    viewport === "fluid" ? availableWidth : viewport === "mobile" ? 390 : 1440;
  const height =
    viewport === "fluid"
      ? Math.max(360, window.innerHeight - 64)
      : viewport === "mobile"
        ? 844
        : 900;
  const scale = Math.min(1, availableWidth / width);
  const running = active && visible && pageVisible;
  const update: PreviewUpdate = {
    channel: previewChannel,
    type: "render",
    document: {
      siteType: document.siteType,
      templateId: document.templateId,
      templateVersion: document.templateVersion,
      draft: document.draft,
    },
    context: { mode, initiallyOpen: mode === "live", active: running, replay },
  };
  const latest = useRef(update);
  latest.current = update;

  useEffect(() => {
    const target = container.current;
    if (!target) {
      return;
    }
    const resize = new ResizeObserver(() =>
      setAvailableWidth(Math.max(1, target.clientWidth)),
    );
    const visibility = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    resize.observe(target);
    visibility.observe(target);
    const onVisibility = () => setPageVisible(!window.document.hidden);
    window.document.addEventListener("visibilitychange", onVisibility);
    return () => {
      resize.disconnect();
      visibility.disconnect();
      window.document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframe.current?.contentWindow ||
        !isSignal(event.data, "ready")
      ) {
        return;
      }
      setReady(true);
      setFailed(false);
      iframe.current?.contentWindow?.postMessage(
        latest.current,
        window.location.origin,
      );
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    if (ready) {
      iframe.current?.contentWindow?.postMessage(
        update,
        window.location.origin,
      );
    }
  }, [
    ready,
    document.draft,
    document.templateId,
    document.templateVersion,
    document.siteType,
    running,
    mode,
    replay,
  ]);

  useEffect(() => {
    if (ready) {
      return;
    }
    const timeout = setTimeout(() => setFailed(true), 8000);
    return () => clearTimeout(timeout);
  }, [ready]);

  function hello() {
    setReady(false);
    iframe.current?.contentWindow?.postMessage(
      { channel: previewChannel, type: "hello" },
      window.location.origin,
    );
  }

  return (
    <div
      className={`renderer-frame renderer-frame-${viewport}`}
      data-ready={ready}
      data-active={running}
      ref={container}
    >
      {failed && (
        <p role="alert">
          The preview could not connect. Check your session and{" "}
          <button
            className="button"
            type="button"
            onClick={() => {
              setFailed(false);
              iframe.current?.contentWindow?.location.reload();
            }}
          >
            Reload preview
          </button>
          .
        </p>
      )}
      <div className="renderer-frame-window" style={{ height: height * scale }}>
        <iframe
          ref={iframe}
          title={
            mode === "live"
              ? "Live preview"
              : mode === "saved"
                ? "Saved draft preview"
                : "Template demo"
          }
          src={`${appBase}/preview-frame/`}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          width={width}
          height={height}
          style={{ width, height, transform: `scale(${scale})` }}
          onLoad={hello}
        />
      </div>
    </div>
  );
}
