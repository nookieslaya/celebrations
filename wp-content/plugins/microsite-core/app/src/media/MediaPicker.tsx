import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "../auth/SessionProvider";
import { ErrorNotice } from "../components/Async";
import { useEditorOperations } from "../components/EditorOperations";
import type { MediaAsset, MediaList, PhotoReference } from "./types";
import "./media.css";

function AssetImage({ asset }: { asset: MediaAsset }) {
  const image = asset.sizes.medium ?? asset.sizes.full;
  return image ? (
    <img
      src={image.url}
      alt=""
      width={image.width}
      height={image.height}
      loading="lazy"
    />
  ) : null;
}

export function MediaPicker({
  projectId,
  value,
  onChange,
}: {
  projectId: number;
  value?: PhotoReference;
  onChange: (photo: PhotoReference | undefined) => void;
}) {
  const { api } = useSession();
  const operations = useEditorOperations();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [library, setLibrary] = useState<MediaList | null>(null);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [assetError, setAssetError] = useState<unknown>(null);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const sending = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    setSelected(null);
    setAssetError(null);
    if (!value) {
      return;
    }
    const controller = new AbortController();
    api
      .mediaAsset(projectId, value.attachmentId, controller.signal)
      .then(setSelected)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setAssetError(error);
        }
      });
    return () => controller.abort();
  }, [api, projectId, value?.attachmentId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setLibrary(null);
    api
      .media(projectId, page, controller.signal)
      .then(setLibrary)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [api, projectId, page, open, refresh]);

  async function upload(file: File) {
    if (sending.current) {
      return;
    }
    setUploadError(null);
    const maxBytes = library?.limits.maxBytes ?? 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(new Error("This photo exceeds the upload size limit."));
      return;
    }
    sending.current = true;
    setUploading(true);
    const finish = operations.begin();
    try {
      const asset = await api.uploadMedia(projectId, file);
      if (alive.current) {
        onChange({ attachmentId: asset.id, alt: value?.alt ?? "" });
        setSelected(asset);
        setPage(1);
        setRefresh((current) => current + 1);
      }
    } catch (error) {
      if (alive.current) {
        setUploadError(error);
      }
    } finally {
      sending.current = false;
      finish();
      if (alive.current) {
        setUploading(false);
      }
    }
  }

  return (
    <div className="media-picker">
      {selected && <AssetImage asset={selected} />}
      {assetError !== null && <ErrorNotice error={assetError} />}
      {value && (
        <>
          <p>Selected photo #{value.attachmentId}</p>
          <label htmlFor={`${inputId}-alt`}>
            Alternative text for this use
          </label>
          <input
            id={`${inputId}-alt`}
            maxLength={240}
            value={value.alt}
            onChange={(event) =>
              onChange({ ...value, alt: event.target.value })
            }
          />
          <button
            type="button"
            className="button"
            onClick={() => onChange(undefined)}
          >
            Remove photo reference
          </button>
          <p className="field-help">
            Removing this reference keeps the file in the library.
          </p>
        </>
      )}
      <button
        type="button"
        className="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Choose or upload photo
      </button>
      {open && (
        <div className="media-library">
          <p className="notice">
            WordPress upload URLs may be accessible to anyone with the link,
            even while your project is private. Upload only photos suitable for
            sharing.
          </p>
          <p className="field-help">
            This is the project owner's application library. An upload creates a
            file immediately; save the draft separately to keep your selection.
          </p>
          <p>
            JPEG, PNG or WebP · up to{" "}
            {(
              (library?.limits.maxBytes ?? 10 * 1024 * 1024) /
              1024 /
              1024
            ).toFixed(1)}{" "}
            MB · up to{" "}
            {((library?.limits.maxPixels ?? 25000000) / 1000000).toFixed(1)} MP
            · {library?.limits.maxFiles ?? 50} photos per owner.
          </p>
          <label htmlFor={`${inputId}-upload`}>Upload photo</label>
          <input
            id={`${inputId}-upload`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void upload(file);
              }
            }}
          />
          {uploading && (
            <p role="status">
              Uploading and processing photo… Save is unavailable until the
              server confirms the asset.
            </p>
          )}
          {uploadError !== null && <ErrorNotice error={uploadError} />}
          {loading && <p role="status">Loading photos…</p>}
          {loadError !== null && (
            <>
              <ErrorNotice error={loadError} />
              <button
                type="button"
                className="button"
                onClick={() => setRefresh((current) => current + 1)}
              >
                Retry library
              </button>
            </>
          )}
          {library && (
            <>
              <div className="media-library-grid">
                {library.items.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="media-library-choice"
                    onClick={() => {
                      onChange({
                        attachmentId: asset.id,
                        alt: value?.alt ?? "",
                      });
                      setOpen(false);
                    }}
                  >
                    <AssetImage asset={asset} />
                    <span>{asset.name || `Photo ${asset.id}`}</span>
                  </button>
                ))}
              </div>
              {library.items.length === 0 && <p>No photos on this page.</p>}
              <div className="wedding-actions">
                <button
                  type="button"
                  className="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous photos
                </button>
                <span>
                  Page {page} of {Math.max(1, library.pagination.totalPages)}
                </span>
                <button
                  type="button"
                  className="button"
                  disabled={page >= library.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next photos
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
