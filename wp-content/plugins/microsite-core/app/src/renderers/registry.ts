import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { Site, SiteTypeId } from "../api/client";

interface RendererDefinition {
  siteType: SiteTypeId;
  Component: LazyExoticComponent<ComponentType<{ value: Site["draft"] }>>;
}

// This trusted registry is the only place where template IDs select code.
// The preview API validates the type, version and full draft before this boundary.
const registry = new Map<string, RendererDefinition>([
  [
    "birthday-party@1",
    {
      siteType: "birthday-invitation",
      Component: lazy(
        () =>
          import("./birthday-party/BirthdayParty") as Promise<{
            default: ComponentType<{ value: Site["draft"] }>;
          }>,
      ),
    },
  ],
]);

export function getRenderer(templateId: string, version: string) {
  return registry.get(`${templateId}@${version}`);
}
