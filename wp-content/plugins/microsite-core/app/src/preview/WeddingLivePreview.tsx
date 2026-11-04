import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../auth/SessionProvider";
import type { WeddingDraft } from "../generated/drafts";
import type { MediaAsset } from "../media/types";
import { LivePreview } from "./LivePreview";
import type { PreviewDocument } from "./protocol";

function inputs(draft: WeddingDraft) {
  const ids = new Set<number>();
  const events = [{ id: "main", ...draft.content.event }];
  for (const venue of draft.content.venues) {
    if (venue.event) {
      events.push({ id: venue.id, ...venue.event });
    }
  }
  for (const section of draft.sections) {
    if (section.type === "schedule") {
      for (const item of section.content.items) {
        events.push({ id: item.id, ...item.event });
      }
    }
    if (!section.enabled) {
      continue;
    }
    if (
      (section.type === "hero" || section.type === "story") &&
      section.content.photo
    ) {
      ids.add(section.content.photo.attachmentId);
    } else if (section.type === "gallery") {
      section.content.photos.forEach((photo) => ids.add(photo.attachmentId));
    }
  }
  return { ids: [...ids].sort((first, second) => first - second), events };
}

function confirmedTimes(
  current: WeddingDraft,
  confirmed: WeddingDraft,
): WeddingDraft {
  const event = (
    value: WeddingDraft["content"]["event"],
    normalised?: WeddingDraft["content"]["event"],
  ) =>
    normalised &&
    normalised.localDateTime === value.localDateTime &&
    normalised.timeZone === value.timeZone
      ? { ...value, startsAt: normalised.startsAt }
      : value;
  return {
    ...current,
    content: {
      ...current.content,
      event: event(current.content.event, confirmed.content.event),
      venues: current.content.venues.map((venue) => ({
        ...venue,
        ...(venue.event
          ? {
              event: event(
                venue.event,
                confirmed.content.venues.find(
                  (candidate) => candidate.id === venue.id,
                )?.event,
              ),
            }
          : {}),
      })),
    },
    sections: current.sections.map((section) => {
      if (section.type !== "schedule") {
        return section;
      }
      const saved = confirmed.sections.find(
        (candidate) => candidate.id === section.id,
      );
      return {
        ...section,
        content: {
          ...section.content,
          items: section.content.items.map((item) => ({
            ...item,
            event: event(
              item.event,
              saved?.type === "schedule"
                ? saved.content.items.find(
                    (candidate) => candidate.id === item.id,
                  )?.event
                : undefined,
            ),
          })),
        },
      };
    }),
  };
}

export function WeddingLivePreview({
  projectId,
  document,
  mobileVisible,
}: {
  projectId: number;
  document: PreviewDocument & { draft: WeddingDraft };
  mobileVisible: boolean;
}) {
  const { api } = useSession();
  const selection = inputs(document.draft);
  const key = JSON.stringify(selection);
  const latest = useRef(document.draft);
  latest.current = document.draft;
  const [result, setResult] = useState<{
    key: string;
    media: MediaAsset[];
    draft: WeddingDraft | null;
  } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++sequence.current;
    setError(false);
    const timer = window.setTimeout(() => {
      const current = inputs(latest.current);
      api
        .resolveWeddingMedia(
          projectId,
          current.ids,
          latest.current,
          controller.signal,
        )
        .then((response) => {
          if (!controller.signal.aborted && sequence.current === request) {
            setResult({ key, ...response });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted && sequence.current === request) {
            setError(true);
          }
        });
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [api, projectId, key, attempt]);

  const selectedIds = selection.ids.join(",");
  const media = useMemo(() => {
    const ids = new Set(selectedIds.split(",").map(Number));
    return result?.media.filter((asset) => ids.has(asset.id)) ?? [];
  }, [result?.media, selectedIds]);
  const draft =
    result?.key === key && result.draft
      ? confirmedTimes(document.draft, result.draft)
      : document.draft;

  return (
    <>
      {error && (
        <p className="notice" role="status">
          Some preview photos or event times could not be resolved. Your draft
          is unchanged.{" "}
          <button
            type="button"
            className="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry preview data
          </button>
        </p>
      )}
      <LivePreview
        document={{ ...document, draft, previewMedia: media }}
        mobileVisible={mobileVisible}
      />
    </>
  );
}
