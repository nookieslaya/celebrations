import type { ComponentType, ReactNode } from "react";
import {
  eventMoment,
  hasText,
  mailLink,
  phoneLink,
  safeWebUrl,
} from "../format";
import type {
  SectionOf,
  SectionProps,
  SectionType,
  WeddingContext,
  WeddingSection,
} from "../types";
import { Countdown } from "./Countdown";
import { Gallery } from "./Gallery";
import { Hero } from "./Hero";
import { Contact, Faq, GuestInfo, Rsvp, Travel } from "./Information";
import { Footer, Gifts, Invitation, Story } from "./Narrative";
import { Schedule, Venues } from "./Venues";

interface SectionDefinition {
  visible: (section: WeddingSection, context: WeddingContext) => boolean;
  render: (section: WeddingSection, context: WeddingContext) => ReactNode;
}

function define<Type extends SectionType>(
  type: Type,
  Component: ComponentType<SectionProps<Type>>,
  visible: (section: SectionOf<Type>, context: WeddingContext) => boolean,
): SectionDefinition {
  return {
    visible: (section, context) =>
      section.type === type && visible(section as SectionOf<Type>, context),
    render: (section, context) =>
      section.type === type ? (
        <Component section={section as SectionOf<Type>} context={context} />
      ) : null,
  };
}

// Only this trusted map chooses components. Neither IDs nor variants resolve paths.
export const sections: Record<SectionType, SectionDefinition> = {
  hero: define("hero", Hero, () => true),
  invitation: define("invitation", Invitation, (section) =>
    hasText(section.content.heading, section.content.text),
  ),
  countdown: define("countdown", Countdown, (_, context) =>
    Boolean(eventMoment(context.draft.content.event)),
  ),
  venues: define("venues", Venues, (section, context) =>
    section.content.venueIds.some((id) =>
      context.draft.content.venues.some(
        (venue) =>
          venue.id === id &&
          (hasText(venue.name, venue.address) ||
            Boolean(venue.event?.startsAt)),
      ),
    ),
  ),
  schedule: define("schedule", Schedule, (section) =>
    section.content.items.some((item) =>
      hasText(item.title, item.description, item.event.startsAt),
    ),
  ),
  story: define(
    "story",
    Story,
    (section, context) =>
      hasText(section.content.text) ||
      Boolean(
        section.content.photo &&
          context.media.has(section.content.photo.attachmentId),
      ),
  ),
  gallery: define("gallery", Gallery, (section, context) =>
    section.content.photos.some((photo) =>
      context.media.has(photo.attachmentId),
    ),
  ),
  "guest-info": define("guest-info", GuestInfo, (section) =>
    section.content.items.some((item) => hasText(item.title, item.text)),
  ),
  travel: define(
    "travel",
    Travel,
    (section) =>
      hasText(section.content.description) ||
      section.content.items.some(
        (item) =>
          hasText(item.name, item.description) || Boolean(safeWebUrl(item.url)),
      ),
  ),
  gifts: define(
    "gifts",
    Gifts,
    (section) =>
      hasText(section.content.text) ||
      section.content.links.some((link) => Boolean(safeWebUrl(link.url))),
  ),
  faq: define("faq", Faq, (section) =>
    section.content.items.some((item) => hasText(item.question, item.answer)),
  ),
  rsvp: define(
    "rsvp",
    Rsvp,
    (section, context) =>
      context.preview || hasText(section.content.heading, section.content.text),
  ),
  contact: define("contact", Contact, (section) =>
    section.content.contacts.some(
      (contact) =>
        hasText(contact.name) ||
        Boolean(mailLink(contact.email)) ||
        Boolean(phoneLink(contact.phone)),
    ),
  ),
  footer: define("footer", Footer, () => true),
};
