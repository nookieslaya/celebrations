import type { MediaAsset } from "../media/types";
import type { Site } from "../api/client";

export const previewChannel = "microsite-preview-v1";
export type PreviewMode = "live" | "saved" | "demo";
export interface PreviewContext {
  mode: PreviewMode;
  initiallyOpen: boolean;
  active: boolean;
  replay: number;
}
export type PreviewDocument = Pick<
  Site,
  "siteType" | "templateId" | "templateVersion" | "draft" | "previewMedia"
>;
export interface PreviewUpdate {
  channel: typeof previewChannel;
  type: "render";
  document: PreviewDocument;
  context: PreviewContext;
}

type Shape = {
  type?: string;
  oneOf?: Shape[];
  enum?: unknown[];
  items?: Shape;
  maxItems?: number;
  properties?: Record<string, Shape>;
  required?: string[];
  maxLength?: number;
};

// Extending the existing contract catalog also extends the transport shape registry.
const schemas = import.meta.glob<Shape>("../../../contracts/*.v1.json", {
  eager: true,
  import: "default",
});
const draftSchemas = new Map(
  Object.entries(schemas).map(([path, schema]) => [
    path
      .split("/")
      .at(-1)!
      .replace(/\.v1\.json$/, ""),
    schema,
  ]),
);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnly(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

/** Check transport shape, not publication rules: incomplete/invalid input is previewable. */
function matchesShape(value: unknown, schema: Shape): boolean {
  if (schema.oneOf) {
    return schema.oneOf.some((candidate) => {
      const discriminator = candidate.properties?.type?.enum;
      return (
        record(value) &&
        discriminator?.includes(value.type) &&
        matchesShape(value, candidate)
      );
    });
  }
  if (schema.type === "array") {
    return (
      Array.isArray(value) &&
      value.length <= (schema.maxItems ?? 0) &&
      Boolean(schema.items) &&
      value.every((item) => matchesShape(item, schema.items!))
    );
  }
  if (schema.type === "string") {
    return (
      typeof value === "string" && value.length <= (schema.maxLength ?? 4000)
    );
  }
  if (schema.type === "boolean") {
    return typeof value === "boolean";
  }
  if (schema.type === "integer" || schema.type === "number") {
    return typeof value === "number";
  }
  if (schema.type !== "object" || !record(value)) {
    return false;
  }
  const properties = schema.properties ?? {};
  return (
    hasOnly(value, Object.keys(properties)) &&
    (schema.required ?? []).every((key) => key in value) &&
    Object.entries(value).every(([key, field]) =>
      matchesShape(field, properties[key]),
    )
  );
}

function isMediaAsset(value: unknown): value is MediaAsset {
  if (
    !record(value) ||
    !hasOnly(value, ["id", "name", "sizes"]) ||
    !Number.isSafeInteger(value.id) ||
    Number(value.id) < 1 ||
    typeof value.name !== "string" ||
    value.name.length > 1000 ||
    !record(value.sizes)
  ) {
    return false;
  }
  const entries = Object.entries(value.sizes);
  return (
    entries.length > 0 &&
    entries.length <= 4 &&
    entries.every(([key, size]) => {
      if (
        !["thumbnail", "medium", "large", "full"].includes(key) ||
        !record(size) ||
        !hasOnly(size, ["url", "width", "height"]) ||
        typeof size.url !== "string" ||
        size.url.length > 4096 ||
        !Number.isSafeInteger(size.width) ||
        Number(size.width) < 1 ||
        !Number.isSafeInteger(size.height) ||
        Number(size.height) < 1
      ) {
        return false;
      }
      try {
        const url = new URL(size.url);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    })
  );
}

export function isSignal(value: unknown, type: "hello" | "ready"): boolean {
  return (
    record(value) &&
    hasOnly(value, ["channel", "type"]) &&
    value.channel === previewChannel &&
    value.type === type
  );
}

export function isPreviewUpdate(value: unknown): value is PreviewUpdate {
  if (
    !record(value) ||
    !hasOnly(value, ["channel", "type", "document", "context"]) ||
    value.channel !== previewChannel ||
    value.type !== "render" ||
    !record(value.document) ||
    !record(value.context)
  ) {
    return false;
  }
  const document = value.document;
  const context = value.context;
  if (
    !hasOnly(document, [
      "siteType",
      "templateId",
      "templateVersion",
      "draft",
      "previewMedia",
    ]) ||
    !hasOnly(context, ["mode", "initiallyOpen", "active", "replay"]) ||
    typeof document.templateId !== "string" ||
    document.templateId.length > 80 ||
    typeof document.templateVersion !== "string" ||
    document.templateVersion.length > 40 ||
    typeof context.mode !== "string" ||
    !["live", "saved", "demo"].includes(context.mode) ||
    typeof context.initiallyOpen !== "boolean" ||
    typeof context.active !== "boolean" ||
    !Number.isSafeInteger(context.replay) ||
    Number(context.replay) < 0
  ) {
    return false;
  }
  if (document.siteType === "wedding") {
    if (
      !Array.isArray(document.previewMedia) ||
      document.previewMedia.length > 42 ||
      !document.previewMedia.every(isMediaAsset)
    ) {
      return false;
    }
  } else if (document.previewMedia !== undefined) {
    return false;
  }
  const schema = draftSchemas.get(String(document.siteType));
  return Boolean(schema && matchesShape(document.draft, schema));
}
