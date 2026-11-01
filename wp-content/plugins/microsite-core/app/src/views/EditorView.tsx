import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ApiError, type Site, type SiteTypeId } from "../api/client";
import { useSession } from "../auth/SessionProvider";
import {
  ErrorNotice,
  Loading,
  useMounted,
  useResource,
} from "../components/Async";
import { appBase } from "../config";
import { copy } from "../copy";
import { getEditor } from "../editors/registry";
import { Link, useRouter } from "../routing/Router";

export function EditorView({ id }: { id: number }) {
  const { api } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => api.read(id, signal),
    [api, id],
  );
  const resource = useResource(load);
  if (resource.loading) {
    return <Loading />;
  }
  if (resource.error !== null) {
    return (
      <>
        <h1>
          {resource.error instanceof ApiError && resource.error.status === 404
            ? copy.notFound
            : copy.edit}
        </h1>
        <ErrorNotice error={resource.error} />
        <Link className="text-link" href={`${appBase}/sites`}>
          {copy.back}
        </Link>
        <button className="button" onClick={resource.retry}>
          {copy.retry}
        </button>
      </>
    );
  }
  return resource.data ? (
    <DraftEditor key={resource.data.id} initial={resource.data} />
  ) : null;
}

function DraftEditor<Type extends SiteTypeId>({
  initial,
}: {
  initial: Site<Type>;
}) {
  const { api } = useSession();
  const { setDirty, navigate } = useRouter();
  const [site, setSite] = useState(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify({ name: initial.name, draft: initial.draft }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState(false);
  const [previewChoice, setPreviewChoice] = useState(false);
  const submitting = useRef(false);
  const mounted = useMounted();
  const module = getEditor(site.siteType);
  const dirty =
    JSON.stringify({ name: site.name, draft: site.draft }) !== savedSnapshot;

  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  async function save(event?: FormEvent, openPreview = false) {
    event?.preventDefault();
    if (submitting.current || !dirty || !module) {
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const saved = await api.update(site.id, {
        name: site.name,
        draft: site.draft,
      });
      if (mounted.current) {
        setSite(saved as Site<Type>);
        setSavedSnapshot(
          JSON.stringify({ name: saved.name, draft: saved.draft }),
        );
        setDirty(false);
        setSuccess(true);
        if (openPreview) {
          navigate(`${appBase}/sites/${saved.id}/preview`, false, true);
        }
      }
    } catch (failure) {
      if (mounted.current) {
        setError(failure);
      }
    } finally {
      submitting.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  if (!module) {
    return (
      <>
        <h1>{site.name}</h1>
        <p className="notice">{copy.unsupportedEditor}</p>
        <Link className="text-link" href={`${appBase}/sites`}>
          {copy.back}
        </Link>
      </>
    );
  }
  const Fields = module.Fields;
  const Preview = module.Preview;

  return (
    <>
      <Link className="text-link" href={`${appBase}/sites`}>
        ← {copy.back}
      </Link>
      <div className="page-title">
        <h1>{copy.edit}</h1>
        <span className="badge">{copy.draft}</span>
      </div>
      <div className="editor-layout">
        <form className="panel-card" onSubmit={(event) => void save(event)}>
          <fieldset disabled={busy}>
            <label htmlFor="project-name">{copy.name}</label>
            <input
              id="project-name"
              required
              maxLength={120}
              value={site.name}
              onChange={(event) => {
                setSite({ ...site, name: event.target.value });
                setSuccess(false);
                setError(null);
              }}
            />
            <Fields
              value={site.draft}
              onChange={(draft) => {
                setSite({ ...site, draft });
                setSuccess(false);
                setError(null);
              }}
            />
            {error !== null && !previewChoice && <ErrorNotice error={error} />}
            {success && (
              <p className="notice success" role="status">
                {copy.saved}
              </p>
            )}
            <p className="changes-state" role="status">
              {dirty ? copy.unsaved : copy.upToDate}
            </p>
            <button className="button primary" type="submit" disabled={!dirty}>
              {busy ? copy.saving : copy.save}
            </button>
          </fieldset>
        </form>
        <div>
          <p className="eyebrow">{copy.preview}</p>
          <Preview value={site.draft} />
          {module.fullPreview && (
            <>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => {
                  if (dirty) {
                    setPreviewChoice(true);
                  } else {
                    navigate(`${appBase}/sites/${site.id}/preview`);
                  }
                }}
              >
                Preview invitation
              </button>
              {previewChoice && (
                <div
                  className="preview-choice"
                  role="dialog"
                  aria-label="Save before preview"
                >
                  <p>
                    The preview uses your last saved draft. Save your changes
                    before opening it?
                  </p>
                  {error !== null && <ErrorNotice error={error} />}
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void save(undefined, true)}
                  >
                    Save and preview
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => setPreviewChoice(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
          <p className="field-help">{copy.previewHelp}</p>
        </div>
      </div>
    </>
  );
}
