import { useEffect, useRef, useState, type ReactNode } from "react";
import "../../../templates/invitation-loader.css";

export function InvitationLoader({
  templateId,
  palette,
}: {
  templateId: string;
  palette?: string;
}) {
  return (
    <div
      className="invitation-loader"
      data-template={templateId}
      data-palette={palette}
      role="status"
      aria-live="polite"
    >
      <span className="invitation-loader-symbol" aria-hidden="true" />
      <span className="invitation-loader-copy">
        {templateId === "birthday-party"
          ? "A good night is on its way"
          : "Preparing something special"}
      </span>
      <span className="invitation-loader-line" aria-hidden="true" />
    </div>
  );
}

/** Wait for real assets, without a minimum artificial delay or indefinite loading. */
export function InvitationAssetGate({
  templateId,
  palette,
  children,
}: {
  templateId: string;
  palette: string;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    const images = Array.from(body.current?.querySelectorAll("img") ?? []);
    const assets = Promise.allSettled([
      document.fonts.ready,
      ...images.map((image) => image.decode().catch(() => undefined)),
    ]);
    const fallback = new Promise((resolve) => {
      timeout = setTimeout(resolve, 1800);
    });
    void Promise.race([assets, fallback]).then(() => {
      clearTimeout(timeout);
      if (active) setReady(true);
    });
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);
  return (
    <div className="invitation-assets-gate" data-ready={ready}>
      {!ready && <InvitationLoader templateId={templateId} palette={palette} />}
      <div
        ref={body}
        className="invitation-assets-body"
        inert={!ready}
        aria-hidden={!ready}
      >
        {children}
      </div>
    </div>
  );
}
