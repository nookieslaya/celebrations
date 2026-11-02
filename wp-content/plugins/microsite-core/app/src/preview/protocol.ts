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
  "siteType" | "templateId" | "templateVersion" | "draft"
>;
export interface PreviewUpdate {
  channel: typeof previewChannel;
  type: "render";
  document: PreviewDocument;
  context: PreviewContext;
}

type Shape = {
  type: string;
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
  const schema = draftSchemas.get(String(document.siteType));
  return Boolean(schema && matchesShape(document.draft, schema));
}
