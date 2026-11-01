import type { GuestPayload } from "./api";

export function GuestFields({
  value,
  onChange,
  maximum,
  fields = {},
}: {
  value: GuestPayload;
  onChange: (value: GuestPayload) => void;
  maximum: number;
  fields?: Record<string, string>;
}) {
  return (
    <>
      <label htmlFor="rsvp-name">Your name</label>
      <input
        id="rsvp-name"
        autoComplete="name"
        maxLength={80}
        required
        value={value.name}
        aria-invalid={Boolean(fields.name)}
        aria-describedby={fields.name ? "rsvp-name-error" : undefined}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
      />
      {fields.name && (
        <p id="rsvp-name-error" className="rsvp-error">
          {fields.name}
        </p>
      )}
      <label htmlFor="rsvp-attending">Will you attend?</label>
      <select
        id="rsvp-attending"
        value={value.attending}
        onChange={(event) =>
          onChange({
            ...value,
            attending: event.target.value as "yes" | "no",
            partySize: event.target.value === "no" ? 0 : 1,
          })
        }
      >
        <option value="yes">Yes, I’m coming</option>
        <option value="no">No, I can’t make it</option>
      </select>
      {fields.attending && <p className="rsvp-error">{fields.attending}</p>}
      {value.attending === "yes" && (
        <>
          <label htmlFor="rsvp-party">
            How many people are coming, including you?
          </label>
          <input
            id="rsvp-party"
            type="number"
            min={1}
            max={maximum}
            step={1}
            required
            value={value.partySize}
            aria-describedby="rsvp-party-help"
            aria-invalid={Boolean(fields.partySize)}
            onChange={(event) =>
              onChange({ ...value, partySize: Number(event.target.value) })
            }
          />
          <p id="rsvp-party-help">Maximum {maximum} people per response.</p>
        </>
      )}
      {fields.partySize && <p className="rsvp-error">{fields.partySize}</p>}
    </>
  );
}
