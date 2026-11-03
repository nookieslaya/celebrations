import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  EditorOperationsProvider,
  useEditorOperations,
} from "../components/EditorOperations";
import { getRenderer } from "../renderers/registry";
import { LivePreview } from "../preview/LivePreview";
import { PublicationPanel } from "../components/PublicationPanel";
import {
  ApiError,
  type Catalog,
  type Site,
  type SiteTypeId,
} from "../api/client";
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
import { rememberStep, rememberedStep } from "../editors/navigation";
import { Link, useRouter } from "../routing/Router";
import "../gallery/gallery.css";

export function EditorView({ id }: { id: number }) {
  const { api } = useSession();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [site, catalog] = await Promise.all([
        api.read(id, signal),
        api.catalog(signal),
      ]);
      return { site, catalog };
    },
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
    <EditorOperationsProvider>
      <DraftEditor
        key={resource.data.site.id}
        initial={resource.data.site}
        catalog={resource.data.catalog}
      />
    </EditorOperationsProvider>
  ) : null;
}

function snapshot(site: Site) {
  return JSON.stringify({ name: site.name, draft: site.draft });
}

function hasContent(value: unknown, path: string): boolean {
  let current = value;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object") {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" && current.trim().length > 0;
}

function DraftEditor<Type extends SiteTypeId>({
  initial,
  catalog,
}: {
  initial: Site<Type>;
  catalog: Catalog;
}) {
  const { api, session } = useSession();
  const operations = useEditorOperations();
  const { setDirty, navigate, location } = useRouter();
  const [site, setSite] = useState(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState(false);
  const [previewChoice, setPreviewChoice] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const submitting = useRef(false);
  const mounted = useMounted();
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const module = getEditor(site.siteType);
  const hasVisualPreview = Boolean(
    getRenderer(site.templateId, site.templateVersion),
  );
  const type = catalog.siteTypes.find((item) => item.id === site.siteType);
  const template = catalog.templates.find(
    (item) => item.id === site.templateId,
  );
  const steps =
    module?.steps?.filter(
      (step) => !step.feature || type?.features.includes(step.feature),
    ) ?? [];
  const query = new URL(location, window.location.origin).searchParams;
  const requested =
    query.get("step") ?? rememberedStep(session.user!.id, site.id);
  const step = steps.find((item) => item.id === requested) ?? steps[0];
  const stepIndex = steps.findIndex((item) => item.id === step?.id);
  const focusField = query.get("field");
  const dirty = snapshot(site) !== savedSnapshot;
  const required = type?.publishRequired ?? [];
  const filled = required.filter((path) => hasContent(site.draft, path)).length;
  const fields = module?.fields ?? {};
  const labels = Object.fromEntries(
    Object.entries(fields).map(([path, field]) => [path, field.label]),
  );

  useEffect(() => {
    setDirty(dirty || operations.pending);
    return () => setDirty(false);
  }, [dirty, operations.pending, setDirty]);

  useEffect(() => {
    if (!step) {
      return;
    }
    rememberStep(session.user!.id, site.id, step.id);
    if (query.get("step") !== step.id) {
      navigate(`${appBase}/sites/${site.id}?step=${step.id}`, true, true, true);
    }
    const frame = requestAnimationFrame(() => {
      const target =
        focusField && fields[focusField]?.step === step.id
          ? document.getElementById(fields[focusField].input)
          : stepHeading.current;
      target?.focus();
    });
    return () => cancelAnimationFrame(frame);
    // Step identity controls focus, never normal changes to form fields.
  }, [step?.id, focusField]);

  function goStep(id: string, field?: string) {
    setMobileView("edit");
    const next = new URLSearchParams({ step: id });
    if (field) {
      next.set("field", field);
    }
    navigate(`${appBase}/sites/${site.id}?${next}`, false, true, true);
  }

  function goField(path: string) {
    const target = fields[path];
    if (target) {
      goStep(target.step, path);
    }
  }

  async function save(
    event?: FormEvent,
    openPreview = false,
  ): Promise<Site | null> {
    event?.preventDefault();
    if (submitting.current || busy || operations.hasPending() || !module) {
      return null;
    }
    if (!dirty) {
      return site;
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
        setSavedSnapshot(snapshot(saved));
        setDirty(false);
        setSuccess(true);
        if (openPreview) {
          navigate(`${appBase}/sites/${saved.id}/preview`, false, true);
        }
      }
      return saved;
    } catch (failure) {
      if (mounted.current) {
        setError(failure);
      }
      return null;
    } finally {
      submitting.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  async function continueAfterSave(event: FormEvent) {
    event.preventDefault();
    const saved = await save();
    if (saved && mounted.current && steps[stepIndex + 1]) {
      goStep(steps[stepIndex + 1].id);
    }
  }

  if (!module) {
    return (
      <>
        <h1>{site.name}</h1>
        <p className="notice">{copy.unsupportedEditor}</p>
        <Link href={`${appBase}/sites`}>{copy.back}</Link>
      </>
    );
  }
  const Fields = module.Fields;
  const appearance = site.draft.appearance as Record<string, string>;
  const palette = Object.values(appearance)[0];
  const content = site.draft.content as Record<string, unknown>;
  const event = content.event as
    | { localDateTime?: string; timeZone?: string }
    | undefined;
  const rsvp = content.rsvp as
    | { enabled?: boolean; maxPartySize?: number }
    | undefined;
  const missing = Object.entries(site.publication.fieldErrors);

  function publicationPanel() {
    return (
      <PublicationPanel
        site={site}
        dirty={dirty}
        busy={busy || operations.pending}
        save={() => save()}
        onBusy={setBusy}
        fieldLabels={labels}
        onField={steps.length ? goField : undefined}
        onChange={(updated) =>
          setSite((current) => ({
            ...current,
            publication: updated.publication,
          }))
        }
      />
    );
  }

  return (
    <>
      <Link className="text-link" href={`${appBase}/sites`}>
        ← {copy.back}
      </Link>
      <div className="page-title">
        <h1>{steps.length ? site.name : copy.edit}</h1>
        <span className="badge">
          {site.publication.published ? "Published" : copy.draft}
        </span>
      </div>
      {steps.length > 0 && (
        <>
          <p className="wizard-progress">
            {filled} of {required.length} publishing details filled in
            <progress
              value={filled}
              max={Math.max(1, required.length)}
              aria-label="Publishing details filled in"
            />
          </p>
          <ol className="wizard-stepper" aria-label="Invitation steps">
            {steps.map((item, index) => {
              const paths = required.filter(
                (path) => fields[path]?.step === item.id,
              );
              const count = paths.filter((path) =>
                hasContent(site.draft, path),
              ).length;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Step ${index + 1}: ${item.title}`}
                    aria-current={item.id === step?.id ? "step" : undefined}
                    onClick={() => goStep(item.id)}
                  >
                    <span>{index + 1}</span>{" "}
                    <span className="wizard-step-name">{item.title}</span>
                    <small>
                      {paths.length
                        ? `${count}/${paths.length} details`
                        : item.feature
                          ? "Optional"
                          : item.review
                            ? "Saved draft status"
                            : "Your chosen palette"}
                    </small>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <div
        className="mobile-editor-toggle"
        role="group"
        aria-label="Editor view"
      >
        <button
          className="button"
          type="button"
          aria-pressed={mobileView === "edit"}
          onClick={() => setMobileView("edit")}
        >
          Edit
        </button>
        <button
          className="button"
          type="button"
          aria-pressed={mobileView === "preview"}
          onClick={() => setMobileView("preview")}
        >
          Preview
        </button>
      </div>
      <div className="editor-layout" data-mobile-view={mobileView}>
        <div className="editor-form-column">
          <form
            className="panel-card"
            onSubmit={
              step && !step.review
                ? continueAfterSave
                : (event) => void save(event)
            }
          >
            {step && (
              <>
                <p className="eyebrow">
                  Step {stepIndex + 1} of {steps.length}
                </p>
                <h2 ref={stepHeading} tabIndex={-1}>
                  {step.title}
                </h2>
              </>
            )}
            <fieldset disabled={busy || operations.pending}>
              {(!step || step.projectName) && (
                <>
                  <label htmlFor="project-name">{copy.name}</label>
                  <input
                    id="project-name"
                    required
                    maxLength={120}
                    value={site.name}
                    onChange={(change) => {
                      setSite({ ...site, name: change.target.value });
                      setSuccess(false);
                      setError(null);
                    }}
                  />
                </>
              )}
              {!step?.review && (
                <Fields
                  projectId={site.id}
                  templateId={site.templateId}
                  section={step?.id}
                  availablePalettes={template?.allowedAppearance.palette}
                  value={site.draft}
                  onChange={(draft) => {
                    setSite({ ...site, draft });
                    setSuccess(false);
                    setError(null);
                  }}
                />
              )}
              {step?.review && (
                <div className="wizard-summary">
                  <dl>
                    <dt>Template</dt>
                    <dd>{template?.name ?? "Invitation"}</dd>
                    <dt>Color palette</dt>
                    <dd>
                      {template?.paletteLabels[palette] ?? "Selected palette"}
                    </dd>
                    <dt>Celebration</dt>
                    <dd>{String(content.celebrantName || "Not set yet")}</dd>
                    <dt>When</dt>
                    <dd>
                      {event?.localDateTime?.replace("T", " · ") ||
                        "Not set yet"}{" "}
                      {event?.timeZone}
                    </dd>
                    <dt>Where</dt>
                    <dd>
                      {String(content.venueName || "Not set yet")}
                      <br />
                      {String(content.address ?? "")}
                    </dd>
                    {type?.features.includes("rsvp") && (
                      <>
                        <dt>Guest responses</dt>
                        <dd>
                          {rsvp?.enabled
                            ? `Enabled · up to ${rsvp.maxPartySize} guests`
                            : "Disabled"}
                        </dd>
                      </>
                    )}
                    <dt>Publication</dt>
                    <dd>
                      {site.publication.published
                        ? "Published"
                        : "Not published"}
                    </dd>
                  </dl>
                  <h3>Still needed before publishing</h3>
                  <p className="field-help">
                    {dirty
                      ? "This check is for your last saved draft. Save your changes to refresh it."
                      : "Checked against your saved draft."}
                  </p>
                  {missing.length ? (
                    <ul className="wizard-missing">
                      {missing.map(([path, message]) => (
                        <li key={path}>
                          <button type="button" onClick={() => goField(path)}>
                            {labels[path] ?? "Invitation details"}
                          </button>{" "}
                          · {message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="notice success">
                      Your saved invitation has all required publishing details.
                    </p>
                  )}
                </div>
              )}
              {error !== null && !previewChoice && (
                <ErrorNotice error={error} />
              )}
              {success && (
                <p className="notice success" role="status">
                  {copy.saved}
                </p>
              )}
              <p className="changes-state" role="status">
                {dirty ? copy.unsaved : copy.upToDate}
              </p>
              <div className="wizard-actions">
                {stepIndex > 0 && (
                  <button
                    className="button"
                    type="button"
                    onClick={() => goStep(steps[stepIndex - 1].id)}
                  >
                    Back
                  </button>
                )}
                <button
                  className="button"
                  type="button"
                  disabled={!dirty}
                  onClick={() => void save()}
                >
                  {busy ? copy.saving : "Save draft"}
                </button>
                {step && !step.review && (
                  <button className="button primary" type="submit">
                    {busy ? copy.saving : "Save & continue"}
                  </button>
                )}
              </div>
            </fieldset>
          </form>
          {step?.review && publicationPanel()}
        </div>
        <div className="editor-preview-column">
          {type?.features.includes("rsvp") && (
            <Link
              className="button"
              href={`${appBase}/sites/${site.id}/responses`}
            >
              Manage responses
            </Link>
          )}
          {hasVisualPreview ? (
            <>
              <LivePreview
                document={site}
                mobileVisible={mobileView === "preview"}
              />
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
                  Preview saved draft
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
                    <a
                      className="button"
                      href={`${appBase}/sites/${site.id}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open saved version in a new tab
                    </a>
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
            </>
          ) : (
            <p className="notice" role="status">
              Visual preview will be available in the next stage
            </p>
          )}
          <p className="field-help">
            {site.publication.published
              ? "Your live page changes only when you publish an update."
              : copy.previewHelp}
          </p>
          {!step && publicationPanel()}
        </div>
      </div>
    </>
  );
}
