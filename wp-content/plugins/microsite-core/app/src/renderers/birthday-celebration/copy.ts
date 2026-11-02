import schema from "../../../../contracts/birthday-invitation.v1.json";
import type { BirthdayInvitationDraft } from "../../generated/drafts";

export const celebrationCopyFields =
  schema.properties.content.properties.celebrationCopy.properties;
export type CelebrationCopyKey = keyof typeof celebrationCopyFields;
export type CelebrationCopy = Record<CelebrationCopyKey, string>;

/** Existing invitations receive defaults without rewriting their saved content. */
export function resolveCelebrationCopy(
  content: BirthdayInvitationDraft["content"],
  paletteName: string,
): CelebrationCopy {
  const entries = Object.entries(celebrationCopyFields).map(([key, field]) => {
    const saved = content.celebrationCopy?.[key as CelebrationCopyKey];
    const text = saved ?? field.default;
    return [
      key,
      text.replace(/\{(name|age|palette)\}/g, (_, variable: string) => {
        if (variable === "name") {
          return content.celebrantName;
        }
        if (variable === "age") {
          return String(content.age ?? "");
        }
        return paletteName;
      }),
    ];
  });
  return Object.fromEntries(entries) as CelebrationCopy;
}
