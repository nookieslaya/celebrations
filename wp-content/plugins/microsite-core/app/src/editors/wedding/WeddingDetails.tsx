import { useId, useState } from "react";
import schema from "../../../../contracts/wedding.v1.json";
import type { WeddingDraft } from "../../generated/drafts";
import { EventFields, TextField } from "./Fields";
import { emptyEvent, sectionNames, stableId } from "./model";

export function WeddingDetails({
  value,
  onChange,
}: {
  value: WeddingDraft;
  onChange: (draft: WeddingDraft) => void;
}) {
  const [removeId, setRemoveId] = useState<string | null>(null);
  const kindId = useId();
  const content = value.content;
  const contract = schema.properties.content.properties;
  const venueContract = contract.venues.items.properties;
  const candidate = content.venues.find((venue) => venue.id === removeId);
  const uses = candidate
    ? value.sections.flatMap((section) => {
        if (
          section.type === "venues" &&
          section.content.venueIds.includes(candidate.id)
        ) {
          return [{ id: section.id, label: sectionNames[section.type] }];
        }
        if (section.type === "schedule") {
          return section.content.items
            .filter((item) => item.venueId === candidate.id)
            .map((item) => ({
              id: `${section.id}-${item.id}`,
              label: `Schedule: ${item.title || "untitled item"}`,
            }));
        }
        return [];
      })
    : [];

  function removeVenue(id: string) {
    const sections = value.sections.map((section) => {
      if (section.type === "venues") {
        return {
          ...section,
          content: {
            ...section.content,
            venueIds: section.content.venueIds.filter(
              (venueId) => venueId !== id,
            ),
          },
        };
      }
      if (section.type === "schedule") {
        return {
          ...section,
          content: {
            ...section.content,
            items: section.content.items.map((item) => {
              if (item.venueId !== id) {
                return item;
              }
              const { venueId: removedVenue, ...remaining } = item;
              void removedVenue;
              return remaining;
            }),
          },
        };
      }
      return section;
    });
    onChange({
      ...value,
      sections,
      content: {
        ...content,
        venues: content.venues.filter((venue) => venue.id !== id),
      },
    });
    setRemoveId(null);
  }

  return (
    <section aria-label="Wedding details">
      <h2>Wedding details</h2>
      <TextField
        label="First partner name"
        limit={contract.couple.properties.firstName.maxLength}
        value={content.couple.firstName}
        onChange={(firstName) =>
          onChange({
            ...value,
            content: { ...content, couple: { ...content.couple, firstName } },
          })
        }
      />
      <TextField
        label="Second partner name"
        limit={contract.couple.properties.secondName.maxLength}
        value={content.couple.secondName}
        onChange={(secondName) =>
          onChange({
            ...value,
            content: { ...content, couple: { ...content.couple, secondName } },
          })
        }
      />
      <TextField
        label="Shared heading (optional)"
        limit={contract.couple.properties.heading.maxLength}
        value={content.couple.heading}
        onChange={(heading) =>
          onChange({
            ...value,
            content: { ...content, couple: { ...content.couple, heading } },
          })
        }
      />
      <EventFields
        value={content.event}
        onChange={(event) =>
          onChange({ ...value, content: { ...content, event } })
        }
      />
      <h3>
        Venues · {content.venues.length}/{contract.venues.maxItems}
      </h3>
      <p>A single venue can host the whole celebration.</p>
      {content.venues.map((venue) => (
        <div className="wedding-list-item" key={venue.id}>
          <TextField
            label="Venue name"
            limit={venueContract.name.maxLength}
            value={venue.name}
            onChange={(name) =>
              onChange({
                ...value,
                content: {
                  ...content,
                  venues: content.venues.map((item) =>
                    item.id === venue.id ? { ...item, name } : item,
                  ),
                },
              })
            }
          />
          <TextField
            label="Address"
            limit={venueContract.address.maxLength}
            value={venue.address}
            multiline
            onChange={(address) =>
              onChange({
                ...value,
                content: {
                  ...content,
                  venues: content.venues.map((item) =>
                    item.id === venue.id ? { ...item, address } : item,
                  ),
                },
              })
            }
          />
          <label htmlFor={`${kindId}-${venue.id}`}>Venue kind</label>
          <select
            id={`${kindId}-${venue.id}`}
            value={venue.kind}
            onChange={(event) => {
              const kind = event.target.value as typeof venue.kind;
              onChange({
                ...value,
                content: {
                  ...content,
                  venues: content.venues.map((item) =>
                    item.id === venue.id ? { ...item, kind } : item,
                  ),
                },
              });
            }}
          >
            <option value="ceremony">Ceremony</option>
            <option value="reception">Reception</option>
            <option value="other">Other / shared venue</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={Boolean(venue.event)}
              onChange={(event) => {
                const updated = { ...venue };
                if (event.target.checked) {
                  updated.event = emptyEvent(content.event.timeZone);
                } else {
                  delete updated.event;
                }
                onChange({
                  ...value,
                  content: {
                    ...content,
                    venues: content.venues.map((item) =>
                      item.id === venue.id ? updated : item,
                    ),
                  },
                });
              }}
            />{" "}
            Set a separate start time
          </label>
          {venue.event && (
            <EventFields
              value={venue.event}
              onChange={(event) =>
                onChange({
                  ...value,
                  content: {
                    ...content,
                    venues: content.venues.map((item) =>
                      item.id === venue.id ? { ...item, event } : item,
                    ),
                  },
                })
              }
            />
          )}
          <button
            type="button"
            className="button"
            onClick={() => setRemoveId(venue.id)}
          >
            Remove venue…
          </button>
        </div>
      ))}
      {candidate && (
        <div className="notice" role="group" aria-label="Confirm venue removal">
          <p>Remove {candidate.name || "this venue"}?</p>
          {uses.length > 0 ? (
            <>
              <p>Used by:</p>
              <ul>
                {uses.map((usage) => (
                  <li key={usage.id}>{usage.label}</li>
                ))}
              </ul>
              <p>
                Confirmation removes these references. Schedule items and their
                other content will be kept.
              </p>
            </>
          ) : (
            <p>This venue has no section references.</p>
          )}
          <button
            type="button"
            className="button"
            onClick={() => removeVenue(candidate.id)}
          >
            Confirm removal and clear references
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setRemoveId(null)}
          >
            Cancel
          </button>
        </div>
      )}
      <button
        type="button"
        className="button"
        disabled={content.venues.length >= contract.venues.maxItems}
        onClick={() =>
          onChange({
            ...value,
            content: {
              ...content,
              venues: [
                ...content.venues,
                { id: stableId(), kind: "other", name: "", address: "" },
              ],
            },
          })
        }
      >
        Add venue
      </button>
    </section>
  );
}
