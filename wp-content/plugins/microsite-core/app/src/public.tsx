import { GuestForm, type PublicRsvpConfig } from "./rsvp/GuestForm";
import { Component, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Site } from "./api/client";
import { getRenderer } from "./renderers/registry";
import "./public.css";

type PublicSnapshot = Pick<
  Site,
  "siteType" | "templateId" | "templateVersion" | "schemaVersion"
> &
  Site["draft"];

class PublicBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p role="alert">
          This page could not be displayed. Please refresh to try again.
        </p>
      );
    }
    return this.props.children;
  }
}

const rsvpData = document.getElementById("microsite-rsvp");
const rsvpConfiguration = rsvpData?.textContent
  ? (JSON.parse(rsvpData.textContent) as PublicRsvpConfig)
  : null;

const root = document.getElementById("public-root");
const data = document.getElementById("microsite-public");

if (root && data?.textContent) {
  const snapshot = JSON.parse(data.textContent) as PublicSnapshot;
  const renderer = getRenderer(snapshot.templateId, snapshot.templateVersion);

  if (renderer && renderer.siteType === snapshot.siteType) {
    const Renderer = renderer.Component;
    createRoot(root).render(
      <PublicBoundary>
        <Suspense fallback={<p role="status">Opening your page…</p>}>
          <Renderer
            value={
              {
                content: snapshot.content,
                appearance: snapshot.appearance,
              } as Site["draft"]
            }
          />
        </Suspense>
        {rsvpConfiguration && <GuestForm configuration={rsvpConfiguration} />}
      </PublicBoundary>,
    );
  } else {
    root.textContent = "This page design is unavailable.";
  }
}
