import { useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { useSession } from "../../auth/SessionProvider";
import { ErrorNotice } from "../../components/Async";
import { appBase } from "../../config";
import { Link, useRouter } from "../../routing/Router";

export function DevelopmentWedding() {
  const { api, session } = useSession();
  const { navigate } = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const sending = useRef(false);

  if (!session.user?.canDevelopWedding) {
    return null;
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (sending.current || uncertain || !name.trim()) {
      return;
    }
    sending.current = true;
    setBusy(true);
    setError(null);
    try {
      const site = await api.create({
        name: name.trim(),
        siteType: "wedding",
        templateId: "modern-editorial",
        presetId: "modern-editorial",
      });
      navigate(`${appBase}/sites/${site.id}`);
    } catch (failure) {
      setError(failure);
      if (
        !(failure instanceof ApiError) ||
        failure.status === 0 ||
        failure.status >= 500 ||
        failure.code === "invalid_response"
      ) {
        setUncertain(true);
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <details className="panel-card">
      <summary>Administrator tools · Wedding development</summary>
      <p>
        Create a private development draft. Wedding is hidden from the customer
        gallery and cannot be published.
      </p>
      <p>
        <Link
          className="button"
          href={`${appBase}/sites/new?demo=modern-editorial`}
        >
          View Modern Editorial demo
        </Link>
      </p>
      <form onSubmit={(event) => void create(event)}>
        <label htmlFor="development-wedding-name">Project name</label>
        <input
          id="development-wedding-name"
          value={name}
          maxLength={120}
          required
          disabled={busy || uncertain}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="submit"
          className="button"
          disabled={busy || uncertain || !name.trim()}
        >
          {busy ? "Creating…" : "Create from Modern Editorial"}
        </button>
      </form>
      {error !== null && <ErrorNotice error={error} />}
      {uncertain && (
        <p className="notice">
          The creation result is unknown. Refresh the project list before
          creating another draft; the server may already have saved it.
        </p>
      )}
    </details>
  );
}
