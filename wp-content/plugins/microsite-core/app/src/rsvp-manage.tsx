import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  copyPrivateLink,
  guestRequest,
  RsvpError,
  type GuestPayload,
  type ManagedResponse,
} from "./rsvp/api";
import { GuestFields } from "./rsvp/GuestFields";
import "./rsvp/rsvp.css";

const configuration = JSON.parse(
  document.getElementById("rsvp-management-config")!.textContent!,
) as { responsesUrl: string };
// A new fragment is a different bearer identity. Reload the isolated shell to
// discard the previous response before reading the newly selected private link.
window.addEventListener("hashchange", () => window.location.reload());
const privateUrl = window.location.href;
const match = /^#([1-9][0-9]*)\.([a-f0-9]{64})$/.exec(window.location.hash);

function Management() {
  const [data, setData] = useState<ManagedResponse | null>(null);
  const [payload, setPayload] = useState<GuestPayload>({
    name: "",
    attending: "yes",
    partySize: 1,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [reload, setReload] = useState(0);
  const running = useRef(false);
  const endpoint = match
    ? new URL(match[1], configuration.responsesUrl).href
    : "";
  const secret = match?.[2] ?? "";

  useEffect(() => {
    const controller = new AbortController();
    if (!match) {
      setError(
        new Error(
          "This response is unavailable or the private link is invalid.",
        ),
      );
      setLoading(false);
      return;
    }
    guestRequest<ManagedResponse>(
      endpoint,
      "GET",
      undefined,
      secret,
      undefined,
      controller.signal,
    )
      .then((result) => {
        setData(result);
        setPayload({
          name: result.response.name,
          attending: result.response.attending,
          partySize: result.response.partySize,
        });
        setError(null);
        setLoading(false);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(failure);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [endpoint, secret, reload]);

  async function operate(operation: "save" | "withdraw" | "delete") {
    if (running.current) {
      return;
    }
    running.current = true;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      if (operation === "delete") {
        await guestRequest<boolean>(endpoint, "DELETE", undefined, secret);
        try {
          for (const key of Object.keys(sessionStorage)) {
            if (
              key.startsWith("microsite-rsvp-pending:") &&
              JSON.parse(sessionStorage.getItem(key) ?? "null")?.secret ===
                secret
            ) {
              sessionStorage.removeItem(key);
            }
          }
        } catch {
          // The answer is deleted even when browser storage is unavailable.
        }
        history.replaceState(null, "", window.location.pathname);
        setData(null);
        setPayload({ name: "", attending: "no", partySize: 0 });
        setConfirmDelete(false);
        setDeleted(true);
      } else {
        const next =
          operation === "withdraw"
            ? {
                name: data!.response.name,
                attending: "no" as const,
                partySize: 0,
              }
            : payload;
        const result = await guestRequest<ManagedResponse>(
          endpoint,
          "PATCH",
          next,
          secret,
        );
        setData(result);
        setPayload({
          name: result.response.name,
          attending: result.response.attending,
          partySize: result.response.partySize,
        });
        setMessage(
          operation === "withdraw"
            ? "Your response has been withdrawn."
            : "Your response has been updated.",
        );
      }
    } catch (failure) {
      setError(failure);
      if (
        failure instanceof RsvpError &&
        failure.code === "microsite_rsvp_closed"
      ) {
        setReload((value) => value + 1);
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="rsvp-card" aria-labelledby="manage-heading">
      <h1 id="manage-heading">Manage your RSVP</h1>
      {loading && <p role="status">Loading your response…</p>}
      {error !== null && (
        <p role="alert" className="rsvp-error">
          {error instanceof Error
            ? error.message
            : "This response is unavailable."}
        </p>
      )}
      {!data && !loading && !deleted && match && (
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
        >
          Try again
        </button>
      )}
      {deleted && (
        <p role="status">
          Your response and personal data have been permanently deleted.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          <p>
            Keep your private link. We do not collect email and cannot recover
            it. Anyone with this link can manage this response.
          </p>
          <label htmlFor="manage-private-link">Private management link</label>
          <input
            id="manage-private-link"
            readOnly
            value={privateUrl}
            onFocus={(event) => event.target.select()}
          />
          <button
            type="button"
            onClick={() =>
              void copyPrivateLink(privateUrl)
                .then(() => setMessage("Private link copied."))
                .catch(setError)
            }
          >
            Copy private link
          </button>
          <p>
            Current response:{" "}
            {data.response.attending === "yes"
              ? `Yes · ${data.response.partySize} people`
              : "No · 0 people"}
          </p>
          {!data.status.open && (
            <p role="status">
              {data.status.reason} You can still delete your personal data.
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void operate("save");
            }}
          >
            <fieldset disabled={busy || !data.status.open}>
              <GuestFields
                value={payload}
                onChange={setPayload}
                maximum={
                  data.status.maxPartySize ??
                  Math.max(data.response.partySize, 1)
                }
                fields={error instanceof RsvpError ? error.fields : {}}
              />
              <div className="rsvp-actions">
                <button type="submit">
                  {busy ? "Saving…" : "Update my response"}
                </button>
                <button type="button" onClick={() => void operate("withdraw")}>
                  Withdraw my response
                </button>
              </div>
            </fieldset>
          </form>
          <p>Your response is shared with the event organizer.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            Delete my data
          </button>
          {confirmDelete && (
            <div
              role="dialog"
              aria-label="Confirm deletion"
              className="rsvp-confirm"
            >
              <p>
                Permanently delete your response and personal data? This cannot
                be undone.
              </p>
              <div className="rsvp-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void operate("delete")}
                >
                  Confirm permanent deletion
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

createRoot(document.getElementById("rsvp-management-root")!).render(
  <Management />,
);
