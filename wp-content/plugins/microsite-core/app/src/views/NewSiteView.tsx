import { useCallback, useRef, useState, type FormEvent } from "react";
import { ApiError, type SiteTypeId } from "../api/client";
import { useSession } from "../auth/SessionProvider";
import { appBase } from "../config";
import { copy } from "../copy";
import {
  ErrorNotice,
  Loading,
  useMounted,
  useResource,
} from "../components/Async";
import { Link, useRouter } from "../routing/Router";
import { RendererFrame } from "../preview/RendererFrame";
import {
  PalettePicker,
  selectedPalette,
  withPalette,
  type Template,
} from "../gallery/PalettePicker";
import "../gallery/gallery.css";

export function NewSiteView() {
  const { api, session } = useSession();
  const { navigate, location } = useRouter();
  const load = useCallback((signal: AbortSignal) => api.catalog(signal), [api]);
  const catalog = useResource(load);
  const query = new URL(location, window.location.origin).searchParams;
  const [name, setName] = useState("");
  const [confirmTemplate, setConfirmTemplate] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [uncertain, setUncertain] = useState(false);
  const submitting = useRef(false);
  const mounted = useMounted();
  const nameInput = useRef<HTMLInputElement>(null);
  const types =
    catalog.data?.siteTypes.filter((type) =>
      catalog.data!.templates.some((template) =>
        template.siteTypes.includes(type.id),
      ),
    ) ?? [];
  const typeId = types.some((type) => type.id === query.get("type"))
    ? query.get("type")!
    : types[0]?.id;
  const templates =
    catalog.data?.templates.filter((template) =>
      template.siteTypes.includes(typeId),
    ) ?? [];
  const demo = templates.find((template) => template.id === query.get("demo"));

  function galleryUrl(template?: Template, palette?: string, showDemo = false) {
    const next = new URLSearchParams({ type: typeId });
    if (template) {
      next.set(showDemo ? "demo" : "template", template.id);
      next.set(
        "palette",
        palette ?? selectedPalette(template, query.get("palette")),
      );
    }
    return `${appBase}/sites/new?${next}`;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || uncertain || !confirmTemplate) {
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const palette = selectedPalette(confirmTemplate, query.get("palette"));
      const site = await api.create({
        name,
        siteType: typeId as SiteTypeId,
        templateId: confirmTemplate.id,
        draft: withPalette(confirmTemplate, palette),
      });
      if (mounted.current) {
        navigate(`${appBase}/sites/${site.id}`, true);
      }
    } catch (failure) {
      if (mounted.current) {
        setError(failure);
        // A lost or malformed success response does not prove the write failed.
        setUncertain(
          !(failure instanceof ApiError) ||
            failure.status === 0 ||
            failure.status >= 500 ||
            failure.code === "invalid_response",
        );
      }
    } finally {
      submitting.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  if (catalog.loading) {
    return <Loading />;
  }
  if (catalog.error !== null) {
    return (
      <>
        <ErrorNotice error={catalog.error} />
        <button className="button" onClick={catalog.retry}>
          {copy.retry}
        </button>
      </>
    );
  }
  if (query.has("demo") && !demo) {
    return (
      <div className="panel-card">
        <h1>Demo unavailable</h1>
        <p>Please choose an available template from the gallery.</p>
        <Link className="button" href={galleryUrl()}>
          Back to templates
        </Link>
      </div>
    );
  }
  if (demo) {
    const palette = selectedPalette(demo, query.get("palette"));
    return (
      <div className="template-demo">
        <div className="template-demo-toolbar">
          <Link href={galleryUrl(demo, palette)}>← Back to templates</Link>
          <strong>Demo · {demo.name}</strong>
          <PalettePicker
            template={demo}
            value={palette}
            onChange={(next) => navigate(galleryUrl(demo, next, true), true)}
          />
        </div>
        <p className="demo-notice">
          Sample invitation. No project is created and guest responses cannot be
          sent.
        </p>
        <div className="template-demo-stage">
          <RendererFrame
            document={{
              siteType: typeId as SiteTypeId,
              templateId: demo.id,
              templateVersion: demo.version,
              draft: withPalette(demo, palette, true),
            }}
            mode="demo"
            viewport="fluid"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Link className="text-link" href={`${appBase}/sites`}>
        ← {copy.back}
      </Link>
      <div className="page-title">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h1>Choose your template</h1>
        </div>
      </div>
      <p className="intro">
        Find the right mood. Explore a demo, choose your colors, then make it
        personal.
      </p>
      {!session.user?.canCreateSites && (
        <p className="notice">{copy.noCreate}</p>
      )}
      {types.length > 1 && (
        <label className="gallery-type">
          What are you making?
          <select
            value={typeId}
            onChange={(event) => {
              setConfirmTemplate(null);
              navigate(`${appBase}/sites/new?type=${event.target.value}`, true);
            }}
          >
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {templates.length === 0 && <p className="notice">{copy.noCatalog}</p>}
      <div className="template-gallery">
        {templates.map((template) => {
          const palette = selectedPalette(
            template,
            query.get("template") === template.id ? query.get("palette") : null,
          );
          return (
            <article className="template-card" key={template.id}>
              <img
                src={template.thumbnailUrls[palette] ?? template.thumbnailUrl}
                width="390"
                height="640"
                loading="lazy"
                alt={`${template.name} invitation preview`}
              />
              <div className="template-card-copy">
                <h2>{template.name}</h2>
                <p>{template.description}</p>
                <PalettePicker
                  template={template}
                  value={palette}
                  onChange={(next) =>
                    navigate(galleryUrl(template, next), true)
                  }
                />
                <div className="gallery-actions">
                  <Link
                    className="button"
                    href={galleryUrl(template, palette, true)}
                  >
                    View demo
                  </Link>
                  <button
                    className="button primary"
                    disabled={
                      !session.user?.canCreateSites || busy || uncertain
                    }
                    onClick={() => {
                      setConfirmTemplate(template);
                      setError(null);
                      navigate(galleryUrl(template, palette), true);
                      requestAnimationFrame(() => nameInput.current?.focus());
                    }}
                  >
                    Use this template
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {confirmTemplate && (
        <form
          className="panel-card gallery-confirm"
          onSubmit={submit}
          aria-labelledby="confirm-project-title"
        >
          <h2 id="confirm-project-title">Make {confirmTemplate.name} yours</h2>
          <p>
            {
              confirmTemplate.paletteLabels[
                selectedPalette(confirmTemplate, query.get("palette"))
              ]
            }{" "}
            · You can save an unfinished invitation and come back later.
          </p>
          <fieldset disabled={busy || uncertain}>
            <label htmlFor="project-name">Project name</label>
            <input
              ref={nameInput}
              id="project-name"
              required
              maxLength={120}
              placeholder="Alex’s birthday"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="gallery-actions">
              <button className="button primary" type="submit">
                {busy ? copy.creating : "Create project"}
              </button>
              <button
                className="button"
                type="button"
                onClick={() => setConfirmTemplate(null)}
              >
                Cancel
              </button>
            </div>
          </fieldset>
          {error !== null && <ErrorNotice error={error} />}
          {uncertain && (
            <p className="notice" role="alert">
              We could not confirm the result. Your project may already exist.{" "}
              <Link href={`${appBase}/sites`}>Check your projects</Link> before
              creating another.
            </p>
          )}
        </form>
      )}
    </>
  );
}
