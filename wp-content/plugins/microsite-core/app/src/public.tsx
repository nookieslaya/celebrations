import { InvitationLoader } from "./components/InvitationLoader";
import { GuestForm, type PublicRsvpConfig } from "./rsvp/GuestForm";
import {
  Component,
  Suspense,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import type { MediaAsset } from "./media/types";
import type { Site } from "./api/client";
import { getRenderer } from "./renderers/registry";
import "./public.css";

type PublicSnapshot = Pick<
  Site,
  "siteType" | "templateId" | "templateVersion" | "schemaVersion"
> &
  Site["draft"] & { media?: MediaAsset[] };

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
    function PublicInvitation() {
      const [rsvpOpen, setRsvpOpen] = useState(false);
      const updateRsvpStatus = useCallback(
        (status: { open: boolean }) => setRsvpOpen(status.open),
        [],
      );
      const form = rsvpConfiguration ? (
        <GuestForm
          configuration={rsvpConfiguration}
          onStatus={renderer?.embeddedRsvp ? updateRsvpStatus : undefined}
        />
      ) : undefined;
      return (
        <PublicBoundary>
          <Suspense
            fallback={
              <InvitationLoader
                templateId={snapshot.templateId}
                palette={
                  "palette" in snapshot.appearance
                    ? snapshot.appearance.palette
                    : undefined
                }
              />
            }
          >
            <Renderer
              value={(() => {
                const {
                  siteType,
                  templateId,
                  templateVersion,
                  schemaVersion,
                  media,
                  ...draft
                } = snapshot;
                void siteType;
                void templateId;
                void templateVersion;
                void schemaVersion;
                void media;
                return draft as Site["draft"];
              })()}
              media={snapshot.media}
              introKey={window.location.pathname}
              rsvpAvailable={rsvpOpen}
              rsvp={renderer?.embeddedRsvp ? form : undefined}
            />
          </Suspense>
          {!renderer?.embeddedRsvp && form}
        </PublicBoundary>
      );
    }
    createRoot(root).render(<PublicInvitation />);
  } else {
    root.textContent = "This page design is unavailable.";
  }
}
