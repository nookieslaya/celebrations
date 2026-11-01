import { useCallback, useRef, useState, type FormEvent } from "react";
import { type SiteTypeId } from "../api/client";
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

export function NewSiteView() {
  const { api, session } = useSession();
  const { navigate } = useRouter();
  const load = useCallback((signal: AbortSignal) => api.catalog(signal), [api]);
  const catalog = useResource(load);
  const [name, setName] = useState("");
  const [chosenType, setChosenType] = useState("");
  const [chosenTemplate, setChosenTemplate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submitting = useRef(false);
  const mounted = useMounted();
  const types =
    catalog.data?.siteTypes.filter((type) =>
      catalog.data!.templates.some((template) =>
        template.siteTypes.includes(type.id),
      ),
    ) ?? [];
  const typeId = chosenType || types[0]?.id || "";
  const templates =
    catalog.data?.templates.filter((template) =>
      template.siteTypes.includes(typeId),
    ) ?? [];
  const templateId = templates.some(
    (template) => template.id === chosenTemplate,
  )
    ? chosenTemplate
    : (templates[0]?.id ?? "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !typeId || !templateId) {
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const site = await api.create({
        name,
        siteType: typeId as SiteTypeId,
        templateId,
      });
      if (mounted.current) {
        navigate(`${appBase}/sites/${site.id}`, true);
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

  return (
    <>
      <Link className="text-link" href={`${appBase}/sites`}>
        ← {copy.back}
      </Link>
      <h1>{copy.newSite}</h1>
      {!session.user?.canCreateSites ? (
        <p className="notice error" role="alert">
          {copy.noCreate}
        </p>
      ) : (
        <>
          {catalog.loading && <Loading />}
          {catalog.error !== null && (
            <>
              <ErrorNotice error={catalog.error} />
              <button className="button" onClick={catalog.retry}>
                {copy.retry}
              </button>
            </>
          )}
          {catalog.data &&
            (types.length === 0 ? (
              <p className="notice">{copy.noCatalog}</p>
            ) : (
              <form className="panel-card" onSubmit={submit}>
                <fieldset disabled={busy}>
                  <label htmlFor="project-name">{copy.name}</label>
                  <input
                    id="project-name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <label htmlFor="site-type">{copy.type}</label>
                  <select
                    id="site-type"
                    value={typeId}
                    onChange={(event) => {
                      setChosenType(event.target.value);
                      setChosenTemplate("");
                    }}
                  >
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="template">{copy.template}</label>
                  <select
                    id="template"
                    value={templateId}
                    onChange={(event) => setChosenTemplate(event.target.value)}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.id} · {template.version}
                      </option>
                    ))}
                  </select>
                  {error !== null && <ErrorNotice error={error} />}
                  <button className="button primary" type="submit">
                    {busy ? copy.creating : copy.create}
                  </button>
                </fieldset>
              </form>
            ))}
        </>
      )}
    </>
  );
}
