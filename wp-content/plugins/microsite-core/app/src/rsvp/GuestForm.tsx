import { useEffect, useRef, useState } from "react";
import {
  copyPrivateLink,
  guestRequest,
  RsvpError,
  type GuestPayload,
  type GuestResponse,
  type RsvpStatus,
} from "./api";
import { GuestFields } from "./GuestFields";
import "./rsvp.css";

export interface PublicRsvpConfig {
  statusUrl: string;
  createUrl: string;
  managementUrl: string;
}

function randomHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function GuestForm({
  configuration,
  onStatus,
}: {
  onStatus?: (status: RsvpStatus) => void;
  configuration: PublicRsvpConfig;
}) {
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const [payload, setPayload] = useState<GuestPayload>({
    name: "",
    attending: "yes",
    partySize: 1,
    website: "",
  });
  const [error, setError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [reload, setReload] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const running = useRef(false);
  const pending = useRef<{ secret: string; key: string } | null>(null);
  const storageKey = `microsite-rsvp-pending:${configuration.createUrl}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (
        saved &&
        /^[a-f0-9]{64}$/.test(saved.secret) &&
        /^[0-9]{10}\.[a-f0-9]{64}$/.test(saved.key)
      ) {
        pending.current = { secret: saved.secret, key: saved.key };
        setRecovering(true);
      }
    } catch {
      // Storage may be unavailable; in-memory retries remain possible.
    }
  }, [storageKey]);

  useEffect(() => {
    const controller = new AbortController();
    guestRequest<RsvpStatus>(
      configuration.statusUrl,
      "GET",
      undefined,
      undefined,
      undefined,
      controller.signal,
    )
      .then((current) => {
        setStatus(current);
        onStatus?.(current);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(failure);
        }
      });
    return () => controller.abort();
  }, [configuration.statusUrl, reload, onStatus]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (running.current) {
      return;
    }
    running.current = true;
    setSending(true);
    setError(null);
    try {
      if (!pending.current) {
        try {
          const saved = JSON.parse(
            sessionStorage.getItem(storageKey) ?? "null",
          );
          if (
            saved &&
            /^[a-f0-9]{64}$/.test(saved.secret) &&
            /^[0-9]{10}\.[a-f0-9]{64}$/.test(saved.key)
          ) {
            pending.current = { secret: saved.secret, key: saved.key };
          }
        } catch {
          // Storage may be disabled. In-memory retries remain safe in this tab.
        }
        pending.current ??= {
          secret: randomHex(),
          key: `${Math.floor(Date.now() / 1000)}.${randomHex()}`,
        };
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(pending.current));
        } catch {
          // No personal data is stored; an unavailable store must not prevent RSVP.
        }
      }
      const result = await guestRequest<{
        response: GuestResponse;
        replayed: boolean;
      }>(
        configuration.createUrl,
        "POST",
        payload,
        pending.current.secret,
        pending.current.key,
      );
      const url = new URL(configuration.managementUrl);
      url.hash = `${result.response.id}.${pending.current.secret}`;
      setLink(url.href);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Successful responses need only the explicitly displayed private link.
      }
      pending.current = null;
    } catch (failure) {
      setError(failure);
      setRecovering(true);
      // Keep the same keys after an uncertain network outcome. Do not silently resubmit with a new identity.
      setReload((value) => value + 1);
    } finally {
      running.current = false;
      setSending(false);
    }
  }

  const fields = error instanceof RsvpError ? error.fields : {};
  return (
    <section className="rsvp-card" aria-labelledby="guest-rsvp-heading">
      <h2 id="guest-rsvp-heading">RSVP</h2>
      {error !== null && (
        <p role="alert" className="rsvp-error">
          {error instanceof Error ? error.message : "RSVP is unavailable."}
        </p>
      )}
      {error instanceof RsvpError &&
        ["microsite_rsvp_consumed", "microsite_rsvp_key_expired"].includes(
          error.code,
        ) && (
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  "Discard this deleted or expired submission and start a new one?",
                )
              ) {
                return;
              }
              pending.current = null;
              setRecovering(false);
              setError(null);
              try {
                sessionStorage.removeItem(storageKey);
              } catch {
                /* Storage may be disabled. */
              }
            }}
          >
            Start a new submission
          </button>
        )}
      {!status && <p role="status">Loading RSVP…</p>}
      {!status && error !== null && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setReload((value) => value + 1);
          }}
        >
          Try again
        </button>
      )}
      {link ? (
        <div>
          <p role="status">Your response is saved.</p>
          <p>
            Keep this private link to view, change, withdraw or delete your
            response. Anyone with it can manage your answer. We do not collect
            email and cannot recover a lost link.
          </p>
          <label htmlFor="rsvp-private-link">
            Your private management link
          </label>
          <input
            id="rsvp-private-link"
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
          />
          <div className="rsvp-actions">
            <a href={link} referrerPolicy="no-referrer">
              Manage my response
            </a>
            <button
              type="button"
              onClick={() =>
                void copyPrivateLink(link)
                  .then(() => setCopied(true))
                  .catch(setError)
              }
            >
              Copy private link
            </button>
          </div>
          {copied && <p role="status">Private link copied.</p>}
        </div>
      ) : status && (status.open || recovering) ? (
        <form onSubmit={(event) => void submit(event)}>
          {recovering && (
            <p>
              An earlier submission may have been saved. Retry with exactly the
              same answers to recover its private link. Closed RSVP permits
              confirmation of an existing response only.
            </p>
          )}
          <fieldset disabled={sending}>
            <GuestFields
              value={payload}
              onChange={setPayload}
              maximum={recovering ? 20 : (status.maxPartySize ?? 1)}
              fields={fields}
            />
            <div className="rsvp-honeypot" aria-hidden="true">
              <label htmlFor="rsvp-website">Leave this field empty</label>
              <input
                id="rsvp-website"
                tabIndex={-1}
                autoComplete="off"
                value={payload.website}
                onChange={(event) =>
                  setPayload({ ...payload, website: event.target.value })
                }
              />
            </div>
            <button type="submit">{sending ? "Sending…" : "Send RSVP"}</button>
          </fieldset>
          <p>Your response will be shared with the event organizer.</p>
          {status.deadlineAt && (
            <p>
              Replies close:{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: status.timeZone ?? "UTC",
              }).format(new Date(status.deadlineAt))}{" "}
              ({status.timeZone}).
            </p>
          )}
        </form>
      ) : (
        status && <p role="status">{status.reason}</p>
      )}
    </section>
  );
}
