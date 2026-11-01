import type { DraftBySiteType } from "../generated/drafts";

export type SiteTypeId = keyof DraftBySiteType;

export interface Site<Type extends SiteTypeId = SiteTypeId> {
  id: number;
  publicId: string;
  name: string;
  siteType: Type;
  templateId: string;
  templateVersion: string;
  schemaVersion: number;
  draft: DraftBySiteType[Type];
  status: "draft";
  createdAt: string;
  updatedAt: string;
}

export interface Catalog {
  siteTypes: Array<{
    id: string;
    name: string;
    schemaVersion: number;
    features: string[];
  }>;
  templates: Array<{
    id: string;
    version: string;
    siteTypes: string[];
    allowedAppearance: Record<string, string[]>;
  }>;
}

export interface SiteList {
  items: Site[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateSite<Type extends SiteTypeId> {
  name: string;
  siteType: Type;
  templateId: string;
  draft?: DraftBySiteType[Type];
}

export interface UpdateSite<Type extends SiteTypeId> {
  name?: string;
  // When supplied, draft replaces the whole configuration.
  draft?: DraftBySiteType[Type];
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  restUrl: string;
  // A future session module must supply this. No public nonce or login workaround.
  getNonce: () => string | null;
}

export function createApiClient(options: ApiClientOptions) {
  const namespace = new URL("microsites/v1/", options.restUrl);

  async function request<Data>(
    path: string,
    method = "GET",
    payload?: unknown,
    protectedOperation = true,
  ): Promise<Data> {
    const headers = new Headers({ Accept: "application/json" });

    if (protectedOperation) {
      const nonce = options.getNonce();

      if (!nonce) {
        throw new ApiError(
          "session_unavailable",
          "Sign in before accessing projects.",
          401,
        );
      }

      headers.set("X-WP-Nonce", nonce);
    }

    if (payload !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(new URL(path, namespace), {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(
        body?.code ?? "http_error",
        body?.message ?? "The request failed.",
        response.status,
      );
    }

    if (!body || !("data" in body)) {
      throw new ApiError(
        "invalid_response",
        "The API returned an invalid response.",
        response.status,
      );
    }

    return body.data as Data;
  }

  return {
    catalog: () => request<Catalog>("catalog", "GET", undefined, false),
    list: (page = 1, perPage = 20) =>
      request<SiteList>(`sites?page=${page}&per_page=${perPage}`),
    read: (id: number) => request<Site>(`sites/${id}`),
    create: <Type extends SiteTypeId>(payload: CreateSite<Type>) =>
      request<Site<Type>>("sites", "POST", payload),
    update: <Type extends SiteTypeId>(id: number, payload: UpdateSite<Type>) =>
      request<Site<Type>>(`sites/${id}`, "PATCH", payload),
  };
}
