import { Arrow, Copy, EventTime, SectionShell } from "../Elements";
import type { SectionProps } from "../types";

const venueLabels = {
  ceremony: "The ceremony",
  reception: "The reception",
  other: "The gathering",
};

export function Venues({ section, context }: SectionProps<"venues">) {
  const venues = section.content.venueIds.flatMap((id) => {
    const venue = context.draft.content.venues.find(
      (candidate) => candidate.id === id,
    );
    return venue &&
      (venue.name.trim() || venue.address.trim() || venue.event?.startsAt)
      ? [venue]
      : [];
  });
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="Places to remember"
      className="me-venues-section"
    >
      <div className="me-venues">
        {venues.map((venue) => (
          <article key={venue.id}>
            <p className="me-kicker">{venueLabels[venue.kind]}</p>
            {venue.name.trim() && <h3>{venue.name}</h3>}
            <Copy text={venue.address} />
            {venue.event && (
              <p className="me-event-caption">
                <EventTime value={venue.event} locale={context.locale} />{" "}
                <span>{venue.event.startsAt ? venue.event.timeZone : ""}</span>
              </p>
            )}
            {venue.address.trim() && (
              <a
                className="me-text-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View directions
                <Arrow />
              </a>
            )}
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

export function Schedule({ section, context }: SectionProps<"schedule">) {
  const items = section.content.items.filter(
    (item) =>
      item.title.trim() || item.description.trim() || item.event.startsAt,
  );
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="The order of the day"
      className="me-schedule-section"
    >
      <ol className="me-schedule">
        {items.map((item) => {
          const venue = context.draft.content.venues.find(
            (candidate) => candidate.id === item.venueId,
          );
          return (
            <li key={item.id}>
              <div className="me-schedule-time">
                <EventTime value={item.event} locale={context.locale} />
                {item.event.startsAt && <span>{item.event.timeZone}</span>}
              </div>
              <div>
                {item.title.trim() && <h3>{item.title}</h3>}
                <Copy text={item.description} />
                {venue?.name.trim() && (
                  <p className="me-caption">{venue.name}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}
