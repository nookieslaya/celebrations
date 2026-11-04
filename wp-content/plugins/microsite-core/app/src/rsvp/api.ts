export interface GuestResponse {
  id: number;
  name: string;
  attending: "yes" | "no";
  partySize: number;
  createdAt: string;
  updatedAt: string;
}

export interface RsvpStatus {
  eventName?: string;
  enabled: boolean;
  open: boolean;
  reason: string | null;
  maxPartySize: number | null;
  deadlineAt: string | null;
  timeZone: string | null;
}

export interface GuestPayload {
  name: string;
  attending: "yes" | "no";
  partySize: number;
  website?: string;
}

export interface ManagedResponse {
  response: GuestResponse;
  status: RsvpStatus;
}

export interface ResponseList {
  items: GuestResponse[];
  summary: { yes: number; no: number; participants: number };
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  status: RsvpStatus;
}

export class RsvpError extends Error {
  constructor(
    message: string,
    public code: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function guestRequest<Data>(
  url: string,
  method = "GET",
  payload?: GuestPayload,
  secret?: string,
  key?: string,
  signal?: AbortSignal,
): Promise<Data> {
  const headers = new Headers({ Accept: "application/json" });
  if (secret) {
    headers.set("X-Microsite-RSVP", secret);
  }
  if (key) {
    headers.set("Idempotency-Key", key);
  }
  if (payload) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      // Preserve same-origin hosting access (e.g. a closed staging gateway).
      // Guest authorization still comes from the RSVP secret, never a WP nonce.
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      body: payload ? JSON.stringify(payload) : undefined,
      signal,
    });
  } catch (failure) {
    if (failure instanceof DOMException && failure.name === "AbortError") {
      throw failure;
    }
    throw new RsvpError(
      "Connection failed. Retry with the same answers to recover your submission safely.",
      "network_error",
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new RsvpError(
      body?.message ?? "RSVP is unavailable.",
      body?.code ?? "http_error",
      body?.data?.fields ?? {},
    );
  }
  if (!body || !("data" in body)) {
    throw new RsvpError(
      "The response could not be confirmed. Retry with the same answers.",
      "invalid_response",
    );
  }
  return body.data as Data;
}

export async function copyPrivateLink(url: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
  } catch {
    // Local HTTP may require a selection-based fallback.
  }
  const input = document.createElement("textarea");
  input.value = url;
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) {
    throw new Error("Select the private link and copy it manually.");
  }
}
