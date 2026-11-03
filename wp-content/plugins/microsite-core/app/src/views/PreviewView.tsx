import { getRenderer } from "../renderers/registry";
import { useCallback } from "react";
import { useSession } from "../auth/SessionProvider";
import { appBase } from "../config";
import { copy } from "../copy";
import { ErrorNotice, Loading, useResource } from "../components/Async";
import { RendererFrame } from "../preview/RendererFrame";
import { Link } from "../routing/Router";

export function PreviewView({ id }: { id: number }) {
  const { api } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => api.preview(id, signal),
    [api, id],
  );
  const resource = useResource(load);
  return (
    <div className="private-preview-shell">
      <div className="private-preview-toolbar">
        <Link href={`${appBase}/sites/${id}`}>
          <span aria-hidden="true">← </span>Back to editor
        </Link>
        <span>Saved draft preview · Changes are not published</span>
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
        (getRenderer(
          resource.data.templateId,
          resource.data.templateVersion,
        ) ? (
          <RendererFrame
            document={resource.data}
            mode="saved"
            viewport="fluid"
          />
        ) : (
          <p className="notice">
            Visual preview will be available in the next stage
          </p>
        ))}
    </div>
  );
}
