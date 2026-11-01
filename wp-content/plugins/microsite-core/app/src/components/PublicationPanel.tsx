import { useRef, useState } from "react";
import { ApiError, type Site } from "../api/client";
import { useSession } from "../auth/SessionProvider";
import { ErrorNotice, useMounted } from "./Async";
import "./publication.css";

interface PublicationPanelProps {
  site: Site;
  dirty: boolean;
  busy: boolean;
  save: () => Promise<Site | null>;
  onChange: (site: Site) => void;
  onBusy: (busy: boolean) => void;
}

async function copyLink(url: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch {
      // Local HTTP and browser permissions may require the selection fallback.
    }
  }
  const input = document.createElement("textarea");
  input.value = url;
  input.setAttribute("aria-label", "Public link");
  input.style.position = "fixed";
  input.style.top = "0";
  input.style.left = "-9999px";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) {
    throw new Error("Copy is unavailable. Select and copy the displayed link.");
  }
}

export function PublicationPanel({
  site,
  dirty,
  busy,
  save,
  onChange,
  onBusy,
}: PublicationPanelProps) {
  const { api } = useSession();
  const [choice, setChoice] = useState<"publish" | "unpublish" | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const running = useRef(false);
  const mounted = useMounted();
  const publication = site.publication;
  const host = new URL(publication.publicUrl).hostname;
  const local =
    host.endsWith(".local") ||
    host.endsWith(".localhost") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]";

  async function operate(operation: "publish" | "unpublish") {
    if (running.current || busy) {
      return;
    }
    running.current = true;
    setError(null);
    setMessage("");
    try {
      if (operation === "publish" && dirty) {
        const saved = await save();
        if (!saved || !mounted.current) {
          if (mounted.current) {
            setError(
              new Error(
                "Saving failed. Your current changes have not been published. Correct the draft and try again.",
              ),
            );
          }
          return;
        }
      }
      onBusy(true);
      const updated = await api[operation](site.id);
      if (mounted.current) {
        onChange(updated);
        setChoice(null);
        setMessage(
          operation === "publish"
            ? "Your live page is up to date."
            : "Publication withdrawn. The public link now returns 404.",
        );
      }
    } catch (failure) {
      if (mounted.current) {
        setError(failure);
      }
    } finally {
      running.current = false;
      if (mounted.current) {
        onBusy(false);
      }
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ url: publication.publicUrl });
        setMessage("Link shared.");
      } else {
        await copyLink(publication.publicUrl);
        setMessage("Link copied.");
      }
    } catch (failure) {
      if (failure instanceof DOMException && failure.name === "AbortError") {
        return;
      }
      setError(failure);
    }
  }

  async function download(format: "svg" | "png") {
    if (running.current || busy) {
      return;
    }
    running.current = true;
    onBusy(true);
    setError(null);
    try {
      // Loaded only for an explicit download, never on project lists.
      const { default: QRCode } = await import("qrcode");
      const options = {
        errorCorrectionLevel: "M" as const,
        margin: 4,
        width: 512,
        color: { dark: "#000000ff", light: "#ffffffff" },
      };
      const blob =
        format === "svg"
          ? new Blob(
              [
                await QRCode.toString(publication.publicUrl, {
                  ...options,
                  type: "svg",
                }),
              ],
              { type: "image/svg+xml" },
            )
          : await (
              await fetch(
                await QRCode.toDataURL(publication.publicUrl, options),
              )
            ).blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `microsite-${site.publicId}.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`QR ${format.toUpperCase()} downloaded.`);
    } catch (failure) {
      setError(failure);
    } finally {
      running.current = false;
      if (mounted.current) {
        onBusy(false);
      }
    }
  }

  const fields =
    error instanceof ApiError ? error.fields : publication.fieldErrors;

  return (
    <section
      className="panel-card publication-panel"
      aria-labelledby="publication-heading"
    >
      <div className="publication-title">
        <h2 id="publication-heading">Publication</h2>
        <span className="badge">
          {publication.published ? "Published" : "Draft"}
        </span>
      </div>
      <p>Save privately, then choose when your live page changes.</p>
      {publication.published &&
        (publication.hasUnpublishedChanges || dirty) && (
          <p className="notice">Unpublished changes</p>
        )}
      {publication.lastPublishedAt && (
        <p className="field-help">
          Last published:{" "}
          <time dateTime={publication.lastPublishedAt}>
            {new Date(publication.lastPublishedAt).toLocaleString()}
          </time>
        </p>
      )}
      {publication.blockedReason && (
        <p className="notice">{publication.blockedReason}</p>
      )}
      {Object.keys(fields).length > 0 && (
        <ul className="publication-fields">
          {Object.entries(fields).map(([path, message]) => (
            <li key={path}>
              <strong>{path}</strong>: {message}
            </li>
          ))}
        </ul>
      )}
      {error !== null && <ErrorNotice error={error} />}
      {message && (
        <p role="status" className="notice success">
          {message}
        </p>
      )}
      <div className="publication-actions">
        <button
          type="button"
          className="button primary"
          disabled={
            busy ||
            (!publication.canPublish &&
              !(dirty && publication.blockedCode === "microsite_not_ready"))
          }
          onClick={() =>
            dirty ? setChoice("publish") : void operate("publish")
          }
        >
          {publication.published ? "Update live page" : "Publish"}
        </button>
        {publication.published && (
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={() => setChoice("unpublish")}
          >
            Unpublish
          </button>
        )}
      </div>
      {choice && (
        <div
          className="preview-choice"
          role="dialog"
          aria-label={
            choice === "publish"
              ? "Save before publishing"
              : "Confirm unpublish"
          }
        >
          <p>
            {choice === "publish"
              ? "Save your current changes, then publish the saved version? Publication stops if saving fails."
              : "Withdraw this page? Anyone opening the link will see an unavailable page."}
          </p>
          <div className="publication-actions">
            <button
              className="button primary"
              type="button"
              disabled={busy}
              onClick={() => void operate(choice)}
            >
              {choice === "publish" ? "Save and publish" : "Confirm unpublish"}
            </button>
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={() => setChoice(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {publication.published && (
        <div className="publication-sharing">
          <label htmlFor="public-url">Public link</label>
          <input
            id="public-url"
            readOnly
            value={publication.publicUrl}
            onFocus={(event) => event.target.select()}
          />
          {local && (
            <p className="notice local-warning">
              Local preview — this link and QR are not publicly accessible.
            </p>
          )}
          <p className="field-help">
            Anyone with this link can open and forward it.
          </p>
          <div className="publication-actions">
            <a
              className="button"
              href={publication.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View live page
            </a>
            <button
              className="button"
              type="button"
              onClick={() =>
                void copyLink(publication.publicUrl)
                  .then(() => setMessage("Link copied."))
                  .catch(setError)
              }
            >
              Copy link
            </button>
            <button
              className="button"
              type="button"
              onClick={() => void share()}
            >
              Share link
            </button>
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={() => void download("svg")}
            >
              Download QR SVG
            </button>
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={() => void download("png")}
            >
              Download QR PNG
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
