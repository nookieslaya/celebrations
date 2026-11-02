import { Component, Suspense, type ReactNode } from "react";
import { getRenderer } from "../renderers/registry";
import { InvitationLoader } from "../components/InvitationLoader";
import { PreviewRsvp } from "./PreviewRsvp";
import type { PreviewUpdate } from "./protocol";

class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        This preview could not load. Reload the preview to try again.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function TemplatePreview({ document, context }: PreviewUpdate) {
  const definition = getRenderer(document.templateId, document.templateVersion);
  if (!definition || definition.siteType !== document.siteType) {
    return <p role="alert">A preview is not available for this template.</p>;
  }
  const Renderer = definition.Component;
  const value = document.draft;
  const configuration =
    "rsvp" in value.content ? value.content.rsvp : undefined;
  const rsvp =
    definition.supportsRsvp && configuration?.enabled ? (
      <PreviewRsvp maximum={configuration.maxPartySize} />
    ) : undefined;
  return (
    <PreviewBoundary>
      <Suspense
        fallback={
          <InvitationLoader
            templateId={document.templateId}
            palette={
              "palette" in value.appearance
                ? value.appearance.palette
                : undefined
            }
          />
        }
      >
        <Renderer
          value={value}
          preview
          previewContext={context}
          rsvp={definition.embeddedRsvp ? rsvp : undefined}
          rsvpAvailable={Boolean(rsvp)}
        />
        {!definition.embeddedRsvp && rsvp}
      </Suspense>
    </PreviewBoundary>
  );
}
