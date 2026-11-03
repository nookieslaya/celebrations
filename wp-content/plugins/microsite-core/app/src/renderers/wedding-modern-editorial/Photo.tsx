import { useState } from "react";
import type { MediaAsset } from "../../media/types";
import { safeWebUrl } from "./format";

export function Photo({
  asset,
  alt,
  hero = false,
  sizes,
  onUnavailable,
}: {
  asset: MediaAsset;
  alt: string;
  hero?: boolean;
  sizes: string;
  onUnavailable?: () => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const candidates = Object.values(asset.sizes)
    .filter((size) => safeWebUrl(size.url) && size.width > 0 && size.height > 0)
    .sort((first, second) => first.width - second.width)
    .filter(
      (size, index, entries) =>
        index === 0 || entries[index - 1].width !== size.width,
    );
  const preferred = asset.sizes.large ?? asset.sizes.medium ?? asset.sizes.full;
  if (!preferred || !safeWebUrl(preferred.url) || failedUrl === preferred.url) {
    return null;
  }
  return (
    <img
      className="me-photo"
      src={preferred.url}
      srcSet={
        candidates.map((size) => `${size.url} ${size.width}w`).join(", ") ||
        undefined
      }
      sizes={sizes}
      width={preferred.width}
      height={preferred.height}
      alt={alt}
      loading={hero ? "eager" : "lazy"}
      fetchPriority={hero ? "high" : "auto"}
      decoding="async"
      onError={() => {
        setFailedUrl(preferred.url);
        onUnavailable?.();
      }}
    />
  );
}
