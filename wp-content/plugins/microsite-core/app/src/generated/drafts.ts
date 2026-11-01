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

export interface DraftBySiteType {
  "basic-page": BasicPageDraft;
}

