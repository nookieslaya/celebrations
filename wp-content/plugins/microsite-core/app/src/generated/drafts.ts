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
    "rsvp"?: {
      "enabled": boolean;
      "maxPartySize": number;
      "deadlineLocal": string;
      "deadlineAt": string;
    };
    "celebrationCopy"?: {
      "collection"?: string;
      "introEyebrow"?: string;
      "introTitle"?: string;
      "introAccent"?: string;
      "introDescription"?: string;
      "openButton"?: string;
      "skipButton"?: string;
      "cardEyebrow"?: string;
      "cardOccasion"?: string;
      "cardNoAge"?: string;
      "seal"?: string;
      "heroEyebrow"?: string;
      "turning"?: string;
      "ageCaption"?: string;
      "replyButton"?: string;
      "discoverButton"?: string;
      "detailsLink"?: string;
      "storyEyebrow"?: string;
      "storyTitle"?: string;
      "storyAccent"?: string;
      "signature"?: string;
      "detailsEyebrow"?: string;
      "detailsTitle"?: string;
      "detailsAccent"?: string;
      "whenLabel"?: string;
      "whereLabel"?: string;
      "directionsLink"?: string;
      "dressLabel"?: string;
      "extraLabel"?: string;
      "rsvpEyebrow"?: string;
      "rsvpTitle"?: string;
      "rsvpAccent"?: string;
      "closingTitle"?: string;
      "closingAccent"?: string;
      "closingEyebrow"?: string;
      "celebrateButton"?: string;
      "pauseButton"?: string;
      "resumeButton"?: string;
      "reducedLabel"?: string;
      "replayButton"?: string;
      "editionLabel"?: string;
      "envelopeRecipient"?: string;
    };
  };
  "appearance": {
    "palette": "electric-citrus" | "pink-noir" | "cobalt-pop" | "midnight-gold" | "disco-rose" | "stardust-silver";
  };
};

export interface DraftBySiteType {
  "basic-page": BasicPageDraft;
  "birthday-invitation": BirthdayInvitationDraft;
}

