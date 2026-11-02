import type { ComponentType } from "react";
import type { DraftBySiteType } from "../generated/drafts";
import type { SiteTypeId } from "../api/client";
import { BasicPageFields } from "./BasicPageEditor";
import { BirthdayInvitationFields } from "./BirthdayInvitationEditor";

export interface EditorStep {
  id: string;
  title: string;
  feature?: string;
  projectName?: boolean;
  review?: boolean;
}

export interface EditorField {
  label: string;
  step: string;
  input: string;
}

export interface EditorModule<Type extends SiteTypeId> {
  steps?: EditorStep[];
  fields?: Record<string, EditorField>;
  Fields: ComponentType<{
    templateId?: string;
    section?: string;
    availablePalettes?: string[];
    value: DraftBySiteType[Type];
    onChange: (draft: DraftBySiteType[Type]) => void;
  }>;
}

type EditorRegistry = { [Type in SiteTypeId]?: EditorModule<Type> };

const registry: EditorRegistry = {
  "birthday-invitation": {
    Fields: BirthdayInvitationFields,
    steps: [
      { id: "about", title: "About the celebration", projectName: true },
      { id: "event", title: "Date & location" },
      { id: "responses", title: "Guest responses", feature: "rsvp" },
      { id: "style", title: "Style" },
      { id: "review", title: "Review & publish", review: true },
    ],
    fields: {
      "content.celebrantName": {
        label: "Celebrant name",
        step: "about",
        input: "celebrant-name",
      },
      "content.heading": {
        label: "Invitation heading",
        step: "about",
        input: "invitation-heading",
      },
      "content.message": {
        label: "Invitation message",
        step: "about",
        input: "invitation-message",
      },
      "content.event.localDateTime": {
        label: "Date and time",
        step: "event",
        input: "event-local",
      },
      "content.event.startsAt": {
        label: "Confirmed event time",
        step: "event",
        input: "event-local",
      },
      "content.event.timeZone": {
        label: "Time zone",
        step: "event",
        input: "event-zone",
      },
      "content.venueName": {
        label: "Venue name",
        step: "event",
        input: "event-venue",
      },
      "content.address": {
        label: "Address",
        step: "event",
        input: "event-address",
      },
    },
  },
  "basic-page": { Fields: BasicPageFields },
};

export function getEditor<Type extends SiteTypeId>(
  type: Type,
): EditorModule<Type> | undefined {
  return registry[type];
}
