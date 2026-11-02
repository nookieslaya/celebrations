import type { ComponentType } from "react";
import type { DraftBySiteType } from "../generated/drafts";
import type { SiteTypeId } from "../api/client";
import { BasicPageFields, BasicPagePreview } from "./BasicPageEditor";
import {
  BirthdayInvitationFields,
  BirthdayInvitationSummary,
} from "./BirthdayInvitationEditor";

export interface EditorModule<Type extends SiteTypeId> {
  Fields: ComponentType<{
    templateId?: string;
    value: DraftBySiteType[Type];
    onChange: (draft: DraftBySiteType[Type]) => void;
  }>;
  Preview: ComponentType<{ value: DraftBySiteType[Type] }>;
  fullPreview?: boolean;
}

type EditorRegistry = { [Type in SiteTypeId]?: EditorModule<Type> };

const registry: EditorRegistry = {
  "birthday-invitation": {
    Fields: BirthdayInvitationFields,
    Preview: BirthdayInvitationSummary,
    fullPreview: true,
  },
  "basic-page": { Fields: BasicPageFields, Preview: BasicPagePreview },
};

export function getEditor<Type extends SiteTypeId>(
  type: Type,
): EditorModule<Type> | undefined {
  return registry[type];
}
