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

export type WeddingDraft = {
  "content": {
    "couple": {
      "firstName": string;
      "secondName": string;
      "heading": string;
    };
    "event": {
      "localDateTime": string;
      "timeZone": string;
      "startsAt": string;
    };
    "venues": Array<{
      "id": string;
      "kind": "ceremony" | "reception" | "other";
      "name": string;
      "address": string;
      "event"?: {
        "localDateTime": string;
        "timeZone": string;
        "startsAt": string;
      };
    }>;
  };
  "appearance": {
    "palette": "ivory-ink" | "sage-linen" | "rose-stone";
    "fontPair": "editorial-serif" | "modern-romantic" | "timeless-classic";
  };
  "entrance": {
    "variant": "reveal" | "envelope" | "typography";
  };
  "sections": Array<{
    "id": string;
    "type": "hero";
    "variant": "photo-full" | "split" | "typography";
    "enabled": boolean;
    "content": {
      "photo"?: {
        "attachmentId": number;
        "alt": string;
      };
      "subtitle": string;
      "cta": "none" | "rsvp" | "venues" | "schedule";
    };
  } | {
    "id": string;
    "type": "invitation";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "text": string;
    };
  } | {
    "id": string;
    "type": "countdown";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
    };
  } | {
    "id": string;
    "type": "venues";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "venueIds": Array<string>;
    };
  } | {
    "id": string;
    "type": "schedule";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "items": Array<{
        "id": string;
        "event": {
          "localDateTime": string;
          "timeZone": string;
          "startsAt": string;
        };
        "title": string;
        "description": string;
        "venueId"?: string;
      }>;
    };
  } | {
    "id": string;
    "type": "story";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "text": string;
      "photo"?: {
        "attachmentId": number;
        "alt": string;
      };
    };
  } | {
    "id": string;
    "type": "gallery";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "photos": Array<{
        "id": string;
        "attachmentId": number;
        "alt": string;
      }>;
    };
  } | {
    "id": string;
    "type": "guest-info";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "items": Array<{
        "id": string;
        "title": string;
        "text": string;
      }>;
    };
  } | {
    "id": string;
    "type": "travel";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "description": string;
      "items": Array<{
        "id": string;
        "name": string;
        "description": string;
        "url"?: string;
      }>;
    };
  } | {
    "id": string;
    "type": "gifts";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "text": string;
      "links": Array<{
        "id": string;
        "label": string;
        "url": string;
      }>;
    };
  } | {
    "id": string;
    "type": "faq";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "items": Array<{
        "id": string;
        "question": string;
        "answer": string;
      }>;
    };
  } | {
    "id": string;
    "type": "rsvp";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "text": string;
      "module": "shared-rsvp";
    };
  } | {
    "id": string;
    "type": "contact";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "heading": string;
      "contacts": Array<{
        "id": string;
        "name": string;
        "email"?: string;
        "phone"?: string;
      }>;
    };
  } | {
    "id": string;
    "type": "footer";
    "variant": "default";
    "enabled": boolean;
    "content": {
      "text": string;
    };
  }>;
};

export interface DraftBySiteType {
  "basic-page": BasicPageDraft;
  "birthday-invitation": BirthdayInvitationDraft;
  "wedding": WeddingDraft;
}

