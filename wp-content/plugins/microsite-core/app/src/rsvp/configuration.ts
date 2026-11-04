import type { SiteTypeId } from "../api/client";
import type {
  BirthdayInvitationDraft,
  WeddingDraft,
  DraftBySiteType,
} from "../generated/drafts";

/** Presentation adapter only. The server independently authorizes every guest write. */
export function rsvpConfiguration(
  type: SiteTypeId,
  draft: DraftBySiteType[SiteTypeId],
) {
  if (type === "birthday-invitation") {
    const configuration = (draft as BirthdayInvitationDraft).content.rsvp;
    return {
      enabled: Boolean(configuration?.enabled),
      maximum: configuration?.maxPartySize ?? 1,
    };
  }
  if (type === "wedding") {
    const section = (draft as WeddingDraft).sections.find(
      (candidate) => candidate.type === "rsvp",
    );
    const settings = section?.content.settings;
    return {
      enabled: Boolean(section?.enabled && settings),
      maximum: settings?.maxPartySize ?? 1,
    };
  }
  return { enabled: false, maximum: 1 };
}
