import { useCallback } from "react";
import { useSession } from "../auth/SessionProvider";
import { appBase } from "../config";
import { copy } from "../copy";
import { ErrorNotice, Loading, useResource } from "../components/Async";
import { Link, useRouter } from "../routing/Router";

export function SitesView() {
  const { api, session } = useSession();
  const { location } = useRouter();
  const query = new URL(location, window.location.origin).searchParams;
  const rawPage = Number(query.get("page") ?? "1");
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 100000
      ? rawPage
      : 1;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [sites, catalog] = await Promise.all([
        api.list(page, 10, signal),
        api.catalog(signal),
      ]);
      return {
        ...sites,
        typeNames: Object.fromEntries(
          catalog.siteTypes.map((type) => [type.id, type.name]),
        ),
      };
    },
    [api, page],
  );
  const resource = useResource(load);

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">{copy.draftLabel}</p>
          <h1>{copy.sites}</h1>
        </div>
        {session.user?.canCreateSites && (
          <Link className="button primary" href={`${appBase}/sites/new`}>
            {copy.newSite}
          </Link>
        )}
      </div>
      <p className="intro">{copy.siteIntro}</p>
      {resource.loading && <Loading />}
      {resource.error !== null && (
        <>
          <ErrorNotice error={resource.error} />
          <button className="button" onClick={resource.retry}>
            {copy.retry}
          </button>
        </>
      )}
      {resource.data && (
        <>
          {resource.data.items.length === 0 ? (
            <section className="empty">
              <div className="paper" aria-hidden="true">
                <span>✳</span>
                <i />
                <i />
                <b />
              </div>
              <h2>{copy.empty}</h2>
              <p>{copy.emptyDescription}</p>
              {session.user?.canCreateSites && (
                <Link className="button" href={`${appBase}/sites/new`}>
                  {copy.newSite}
                </Link>
              )}
            </section>
          ) : (
            <div className="site-list">
              {resource.data.items.map((site) => (
                <article className="site-card" key={site.id}>
                  <div>
                    <span className="badge">{copy.draft}</span>
                    <h2>{site.name}</h2>
                    <p>
                      {resource.data!.typeNames[site.siteType] ?? site.siteType}
                    </p>
                    <small>
                      {copy.updated}:{" "}
                      <time dateTime={site.updatedAt}>
                        {new Date(site.updatedAt).toLocaleString()}
                      </time>
                    </small>
                  </div>
                  <Link className="button" href={`${appBase}/sites/${site.id}`}>
                    {copy.edit}
                  </Link>
                </article>
              ))}
            </div>
          )}
          {(resource.data.pagination.totalPages > 1 || page > 1) && (
            <nav className="pagination" aria-label="Project pages">
              {page > 1 && (
                <Link
                  className="button"
                  href={`${appBase}/sites?page=${page - 1}`}
                >
                  {copy.previous}
                </Link>
              )}
              <span>
                {page} / {Math.max(1, resource.data.pagination.totalPages)}
              </span>
              {page < resource.data.pagination.totalPages && (
                <Link
                  className="button"
                  href={`${appBase}/sites?page=${page + 1}`}
                >
                  {copy.next}
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
