import { useCallback, useRef, useState } from "react";
import { useSession } from "../auth/SessionProvider";
import {
  ErrorNotice,
  Loading,
  useMounted,
  useResource,
} from "../components/Async";
import { appBase } from "../config";
import { Link } from "../routing/Router";
import type { GuestResponse } from "../rsvp/api";
import "../rsvp/rsvp.css";

export function ResponsesView({ id }: { id: number }) {
  const { api } = useSession();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<GuestResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const running = useRef(false);
  const mounted = useMounted();
  const load = useCallback(
    (signal: AbortSignal) => api.responses(id, page, filter, signal),
    [api, id, page, filter, refresh],
  );
  const resource = useResource(load);

  async function remove() {
    if (!selected || running.current) {
      return;
    }
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await api.deleteResponse(id, selected.id);
      if (mounted.current) {
        setSelected(null);
        if (resource.data?.items.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          setRefresh((value) => value + 1);
        }
      }
    } catch (failure) {
      if (mounted.current) {
        setError(failure);
      }
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  return (
    <>
      <Link className="text-link" href={`${appBase}/sites/${id}`}>
        ← Back to editor
      </Link>
      <h1>RSVP responses</h1>
      {resource.loading ? (
        <Loading />
      ) : resource.error !== null ? (
        <>
          <ErrorNotice error={resource.error} />
          <button className="button" onClick={resource.retry}>
            Try again
          </button>
        </>
      ) : (
        resource.data && (
          <section className="panel-card" aria-label="Organizer responses">
            <p role="status">
              Public RSVP:{" "}
              {resource.data.status.open ? "Open" : resource.data.status.reason}
            </p>
            <div className="response-summary" aria-label="Response summary">
              <p>
                Yes responses: <strong>{resource.data.summary.yes}</strong>
              </p>
              <p>
                Participants:{" "}
                <strong>{resource.data.summary.participants}</strong>
              </p>
              <p>
                No responses: <strong>{resource.data.summary.no}</strong>
              </p>
            </div>
            <p>
              These totals cover every response, regardless of the current
              filter or page. We do not have a list of invited people or know
              how many have not replied.
            </p>
            <label htmlFor="response-filter">Filter responses</label>
            <select
              id="response-filter"
              value={filter}
              disabled={busy}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All responses</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {resource.data.items.length === 0 && (
              <p>No submitted responses match this filter.</p>
            )}
            <ul className="response-list">
              {resource.data.items.map((response) => (
                <li key={response.id}>
                  <h3>{response.name}</h3>
                  <p>
                    {response.attending === "yes" ? "Yes" : "No"} ·{" "}
                    {response.partySize} participants
                  </p>
                  <p>
                    Updated:{" "}
                    <time dateTime={response.updatedAt}>
                      {new Date(response.updatedAt).toLocaleString()}
                    </time>
                  </p>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      setSelected(response);
                    }}
                  >
                    Delete response from {response.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="publication-actions">
              <button
                className="button"
                disabled={busy || page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous page
              </button>
              <span>
                Page {page} of{" "}
                {Math.max(1, resource.data.pagination.totalPages)}
              </span>
              <button
                className="button"
                disabled={busy || page >= resource.data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next page
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => setRefresh((value) => value + 1)}
              >
                Refresh responses
              </button>
            </div>
          </section>
        )
      )}
      {selected && (
        <div
          className="panel-card"
          role="dialog"
          aria-label="Delete guest response"
        >
          <p>
            Permanently delete the response from {selected.name}? This cannot be
            undone.
          </p>
          {error !== null && <ErrorNotice error={error} />}
          <div className="publication-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => void remove()}
            >
              Confirm delete response
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
