// Generated from contracts/*.json. Do not edit by hand.

export type BasicPageDraft = {
  "content": {
    "heading": string;
    "description": string;
  };
  "appearance": {
    "accent": "sage" | "rose" | "ocean";
  };
};

export type BirthdayInvitationDraft = {
  "content": {
    "celebrantName": string;
    "age"?: number;
    "heading": string;
    "message": string;
    "event": {
      "localDateTime": string;
      "timeZone": string;
      "startsAt": string;
    };
    "venueName": string;
    "address": string;
    "dressCode"?: string;
    "additionalInfo"?: string;
  };
  "appearance": {
    "palette": "electric-citrus" | "pink-noir" | "cobalt-pop";
  };
};

export interface DraftBySiteType {
  "basic-page": BasicPageDraft;
  "birthday-invitation": BirthdayInvitationDraft;
}

