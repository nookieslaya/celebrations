import { Component, Suspense, useCallback, type ReactNode } from "react";
import { useSession } from "../auth/SessionProvider";
import { appBase } from "../config";
import { copy } from "../copy";
import { ErrorNotice, Loading, useResource } from "../components/Async";
import { getRenderer } from "../renderers/registry";
import { Link } from "../routing/Router";

class RendererBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <p className="notice error" role="alert">
          The invitation could not be loaded. Return to the editor or refresh
          this page.
        </p>
      );
    }
    return this.props.children;
  }
}

export function PreviewView({ id }: { id: number }) {
  const { api } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => api.preview(id, signal),
    [api, id],
  );
  const resource = useResource(load);
  const definition = resource.data
    ? getRenderer(resource.data.templateId, resource.data.templateVersion)
    : undefined;
  const Renderer = definition?.Component;

  return (
    <div className="private-preview-shell">
      <div className="private-preview-toolbar">
        <Link href={`${appBase}/sites/${id}`}><span aria-hidden="true">← </span>Back to editor</Link>
        <span>Private draft · Not published</span>
      </div>
      {resource.loading && (
        <div className="private-preview-message">
          <Loading />
        </div>
      )}
      {resource.error !== null && (
        <div className="private-preview-message">
          <h1>{copy.notFound}</h1>
          <ErrorNotice error={resource.error} />
          <button className="button" onClick={resource.retry}>
            {copy.retry}
          </button>
        </div>
      )}
      {resource.data &&
        (Renderer && definition.siteType === resource.data.siteType ? (
          <RendererBoundary key={`${id}:${resource.data.updatedAt}`}>
            <Suspense
              fallback={
                <div className="private-preview-message">
                  <Loading message="Opening your invitation…" />
                </div>
              }
            >
              <Renderer value={resource.data.draft} />
            </Suspense>
          </RendererBoundary>
        ) : (
          <div className="private-preview-message">
            <p className="notice">
              A preview is not available for this template version.
            </p>
          </div>
        ))}
    </div>
  );
}
