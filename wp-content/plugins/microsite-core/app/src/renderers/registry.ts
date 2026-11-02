import {
  lazy,
  type ComponentType,
  type ReactNode,
  type LazyExoticComponent,
} from "react";
import type { PreviewContext } from "../preview/protocol";
import type { Site, SiteTypeId } from "../api/client";

export interface RendererProps {
  preview?: boolean;
  previewContext?: PreviewContext;
  introKey?: string;
  value: Site["draft"];
  rsvp?: ReactNode;
  rsvpAvailable?: boolean;
}

interface RendererDefinition {
  embeddedRsvp?: boolean;
  supportsRsvp?: boolean;
  supportsOpening?: boolean;
  siteType: SiteTypeId;
  Component: LazyExoticComponent<ComponentType<RendererProps>>;
}

// This trusted registry is the only place where template IDs select code.
// The preview API validates the type, version and full draft before this boundary.
const registry = new Map<string, RendererDefinition>([
  [
    "birthday-celebration@1",
    {
      siteType: "birthday-invitation",
      embeddedRsvp: true,
      supportsOpening: true,
      supportsRsvp: true,
      Component: lazy(
        () =>
          import("./birthday-celebration/BirthdayCelebration") as Promise<{
            default: ComponentType<RendererProps>;
          }>,
      ),
    },
  ],
  [
    "basic@1.0.0",
    {
      siteType: "basic-page",
      Component: lazy(
        () =>
          import("./basic/BasicPage") as Promise<{
            default: ComponentType<RendererProps>;
          }>,
      ),
    },
  ],
  [
    "birthday-party@1",
    {
      siteType: "birthday-invitation",
      supportsOpening: true,
      supportsRsvp: true,
      Component: lazy(
        () =>
          import("./birthday-party/BirthdayParty") as Promise<{
            default: ComponentType<RendererProps>;
          }>,
      ),
    },
  ],
]);

export function getRenderer(templateId: string, version: string) {
  return registry.get(`${templateId}@${version}`);
}
