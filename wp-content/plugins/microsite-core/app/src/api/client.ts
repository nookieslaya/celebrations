import type { MediaAsset, MediaList } from "../media/types";
import type { ResponseList } from "../rsvp/api";
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
  publication: {
    published: boolean;
    publicUrl: string;
    lastPublishedAt: string | null;
    hasUnpublishedChanges: boolean;
    canPublish: boolean;
    blockedReason: string | null;
    blockedCode: string | null;
    fieldErrors: Record<string, string>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Catalog {
  siteTypes: Array<{
    id: string;
    name: string;
    schemaVersion: number;
    features: string[];
    publishRequired: string[];
  }>;
  templates: Array<{
    id: string;
    version: string;
    siteTypes: string[];
    allowedAppearance: Record<string, string[]>;
    name: string;
    description: string;
    thumbnailUrl: string;
    thumbnailUrls: Record<string, string>;
    paletteLabels: Record<string, string>;
    initialDraft: Site["draft"];
    demoDraft: Site["draft"];
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
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface SessionUser {
  id: number;
  email: string;
  displayName: string;
  canCreateSites: boolean;
  canEditSites: boolean;
  canDevelopWedding: boolean;
}

export interface Session {
  user: SessionUser | null;
  nonce: string | null;
  registrationEnabled: boolean;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  passwordConfirmation: string;
}

export interface ApiClientOptions {
  restUrl: string;
  getNonce: () => string | null;
  getAuthCsrfToken: () => string;
  onNonce: (nonce: string) => void;
  onSessionExpired: () => void;
}

export function createApiClient(options: ApiClientOptions) {
  const namespace = new URL("microsites/v1/", options.restUrl);

  async function request<Data>(
    path: string,
    method = "GET",
    payload?: unknown,
    protectedOperation = true,
    signal?: AbortSignal,
    authOperation = false,
  ): Promise<Data> {
    const headers = new Headers({ Accept: "application/json" });
    const requestNonce = protectedOperation ? options.getNonce() : null;

    if (protectedOperation) {
      if (!requestNonce) {
        throw new ApiError(
          "session_unavailable",
          "Sign in before accessing projects.",
          401,
        );
      }
      headers.set("X-WP-Nonce", requestNonce);
    }

    if (authOperation) {
      headers.set("X-Microsite-CSRF", options.getAuthCsrfToken());
    }

    const multipart = payload instanceof FormData;

    if (payload !== undefined && !multipart) {
      headers.set("Content-Type", "application/json");
    }

    let response: Response;
    try {
      response = await fetch(new URL(path, namespace), {
        method,
        headers,
        credentials: "same-origin",
        cache: "no-store",
        signal,
        body: multipart
          ? payload
          : payload === undefined
            ? undefined
            : JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new ApiError(
        "network_error",
        "Connection failed. Check your network and try again.",
        0,
      );
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      if (
        protectedOperation &&
        (response.status === 401 ||
          body?.code === "rest_cookie_invalid_nonce") &&
        options.getNonce() === requestNonce
      ) {
        options.onSessionExpired();
      }
      throw new ApiError(
        body?.code ?? "http_error",
        body?.message ?? "The request failed.",
        response.status,
        body?.data?.fields ?? {},
      );
    }

    if (!body || typeof body !== "object" || !("data" in body)) {
      throw new ApiError(
        "invalid_response",
        "The API returned an invalid response.",
        response.status,
        body?.data?.fields ?? {},
      );
    }

    const refreshedNonce = response.headers.get("X-WP-Nonce");
    if (
      protectedOperation &&
      refreshedNonce &&
      options.getNonce() === requestNonce
    ) {
      options.onNonce(refreshedNonce);
    }

    return body.data as Data;
  }

  return {
    media: (id: number, page = 1, signal?: AbortSignal) =>
      request<MediaList>(
        `sites/${id}/media?page=${page}`,
        "GET",
        undefined,
        true,
        signal,
      ),
    mediaAsset: (id: number, asset: number, signal?: AbortSignal) =>
      request<MediaAsset>(
        `sites/${id}/media/${asset}`,
        "GET",
        undefined,
        true,
        signal,
      ),
    uploadMedia: (id: number, file: File) => {
      const data = new FormData();
      data.append("file", file);
      return request<MediaAsset>(`sites/${id}/media`, "POST", data);
    },
    catalog: (signal?: AbortSignal) =>
      request<Catalog>("catalog", "GET", undefined, false, signal),
    session: (signal?: AbortSignal) =>
      request<Session>("session", "GET", undefined, true, signal),
    login: (payload: Credentials) =>
      request<Session>("auth/login", "POST", payload, false, undefined, true),
    register: (payload: Registration) =>
      request<Session>(
        "auth/register",
        "POST",
        payload,
        false,
        undefined,
        true,
      ),
    logout: () => request<Session>("auth/logout", "POST"),
    responses: (id: number, page = 1, filter = "", signal?: AbortSignal) =>
      request<ResponseList>(
        `sites/${id}/responses?page=${page}&attending=${encodeURIComponent(filter)}`,
        "GET",
        undefined,
        true,
        signal,
      ),
    deleteResponse: (id: number, responseId: number) =>
      request<boolean>(`sites/${id}/responses/${responseId}`, "DELETE"),
    publish: (id: number) => request<Site>(`sites/${id}/publish`, "POST"),
    unpublish: (id: number) => request<Site>(`sites/${id}/unpublish`, "POST"),
    list: (page = 1, perPage = 20, signal?: AbortSignal) =>
      request<SiteList>(
        `sites?page=${page}&per_page=${perPage}`,
        "GET",
        undefined,
        true,
        signal,
      ),
    preview: (id: number, signal?: AbortSignal) =>
      request<Site>(`sites/${id}/preview`, "GET", undefined, true, signal),
    read: (id: number, signal?: AbortSignal) =>
      request<Site>(`sites/${id}`, "GET", undefined, true, signal),
    create: <Type extends SiteTypeId>(payload: CreateSite<Type>) =>
      request<Site<Type>>("sites", "POST", payload),
    update: <Type extends SiteTypeId>(id: number, payload: UpdateSite<Type>) =>
      request<Site<Type>>(`sites/${id}`, "PATCH", payload),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
