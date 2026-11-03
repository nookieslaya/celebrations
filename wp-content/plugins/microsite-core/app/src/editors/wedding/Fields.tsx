import { useId, type ReactNode } from "react";
import type { WeddingDraft } from "../../generated/drafts";
import type { WeddingEvent } from "./model";

export function TextField({
  label,
  value,
  onChange,
  limit,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  limit: number;
  multiline?: boolean;
  type?: "text" | "url" | "email" | "tel";
}) {
  const id = useId();
  return (
    <div className="wedding-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          rows={4}
          maxLength={limit}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          maxLength={limit}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

export function EventFields({
  value,
  onChange,
}: {
  value: WeddingEvent;
  onChange: (event: WeddingEvent) => void;
}) {
  const id = useId();
  return (
    <div className="wedding-event-fields">
      <label htmlFor={`${id}-time`}>Local date and time</label>
      <input
        id={`${id}-time`}
        type="datetime-local"
        step={60}
        min="1900-01-01T00:00"
        max="2200-12-31T23:59"
        value={value.localDateTime}
        onChange={(event) =>
          onChange({
            ...value,
            localDateTime: event.target.value,
            startsAt: "",
          })
        }
      />
      <TextField
        label="IANA time zone"
        limit={64}
        value={value.timeZone}
        onChange={(timeZone) => onChange({ ...value, timeZone, startsAt: "" })}
      />
      <p className="field-help">
        The server confirms UTC and checks daylight-saving time when you save.
        An empty date is allowed in a draft.
      </p>
    </div>
  );
}

export function VenueSelect({
  value,
  venues,
  onChange,
}: {
  value?: string;
  venues: WeddingDraft["content"]["venues"];
  onChange: (id: string | undefined) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Venue</label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">No venue selected</option>
        {venues.map((venue) => (
          <option key={venue.id} value={venue.id}>
            {venue.name || "Unnamed venue"}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ListFields<Item extends { id: string }>({
  label,
  items,
  limit,
  createItem,
  onChange,
  children,
}: {
  label: string;
  items: Item[];
  limit: number;
  createItem?: () => Item;
  onChange: (items: Item[]) => void;
  children: (item: Item, update: (item: Item) => void) => ReactNode;
}) {
  function move(id: string, direction: number) {
    const index = items.findIndex((item) => item.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= items.length) {
      return;
    }
    const reordered = [...items];
    [reordered[index], reordered[destination]] = [
      reordered[destination],
      reordered[index],
    ];
    onChange(reordered);
  }

  return (
    <div className="wedding-list">
      <h4>
        {label} · {items.length}/{limit}
      </h4>
      {items.map((item, index) => (
        <div className="wedding-list-item" key={item.id}>
          <p>
            {label} · item {index + 1}
          </p>
          {children(item, (updated) =>
            onChange(
              items.map((current) =>
                current.id === item.id ? updated : current,
              ),
            ),
          )}
          <div className="wedding-actions">
            <button
              type="button"
              className="button"
              disabled={index === 0}
              aria-label={`Move ${label} item ${index + 1} up`}
              onClick={() => move(item.id, -1)}
            >
              Move up
            </button>
            <button
              type="button"
              className="button"
              disabled={index === items.length - 1}
              aria-label={`Move ${label} item ${index + 1} down`}
              onClick={() => move(item.id, 1)}
            >
              Move down
            </button>
            <button
              type="button"
              className="button"
              onClick={() =>
                onChange(items.filter((current) => current.id !== item.id))
              }
            >
              Remove item
            </button>
          </div>
        </div>
      ))}
      {createItem && (
        <button
          type="button"
          className="button"
          disabled={items.length >= limit}
          onClick={() => onChange([...items, createItem()])}
        >
          Add {label.toLowerCase()} item
        </button>
      )}
    </div>
  );
}
