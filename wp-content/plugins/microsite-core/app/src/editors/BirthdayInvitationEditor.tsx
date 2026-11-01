import { RsvpSettings } from "../rsvp/RsvpSettings";
import schema from "../../../contracts/birthday-invitation.v1.json";
import type { BirthdayInvitationDraft } from "../generated/drafts";
import "./birthday-editor.css";

const contentSchema = schema.properties.content.properties;
const palettes = schema.properties.appearance.properties.palette.enum;
export const birthdayCopy = {
  name: "Celebrant name",
  age: "Age (optional)",
  heading: "Invitation heading",
  message: "Invitation message",
  date: "Local date and time",
  zone: "Time zone",
  venue: "Venue name",
  address: "Address",
  dress: "Dress code (optional)",
  extra: "Additional information (optional)",
  palette: "Color palette",
  timeHelp:
    "Enter the time at the venue, then choose its IANA time zone. Clock-change gaps and repeated times are checked when you save.",
  incomplete: "You can leave details blank and finish this draft later.",
  palettes: {
    "electric-citrus": "Electric citrus",
    "pink-noir": "Pink noir",
    "cobalt-pop": "Cobalt pop",
  },
};

interface Props {
  value: BirthdayInvitationDraft;
  onChange: (value: BirthdayInvitationDraft) => void;
}

export function BirthdayInvitationFields({ value, onChange }: Props) {
  const content = value.content;
  function update(changes: Partial<BirthdayInvitationDraft["content"]>) {
    onChange({ ...value, content: { ...content, ...changes } });
  }
  return (
    <div className="birthday-fields">
      <p className="field-help">{birthdayCopy.incomplete}</p>
      <section aria-labelledby="celebrant-fields">
        <h2 id="celebrant-fields">Celebrant</h2>
        <label htmlFor="celebrant-name">{birthdayCopy.name}</label>
        <input
          id="celebrant-name"
          maxLength={contentSchema.celebrantName.maxLength}
          value={content.celebrantName}
          onChange={(event) => update({ celebrantName: event.target.value })}
        />
        <label htmlFor="celebrant-age">{birthdayCopy.age}</label>
        <input
          id="celebrant-age"
          type="number"
          min={contentSchema.age.minimum}
          max={contentSchema.age.maximum}
          step={1}
          value={content.age ?? ""}
          onChange={(event) => {
            if (event.target.value === "") {
              const next = { ...content };
              delete next.age;
              onChange({ ...value, content: next });
            } else {
              update({ age: Number(event.target.value) });
            }
          }}
        />
      </section>
      <section aria-labelledby="invitation-fields">
        <h2 id="invitation-fields">Invitation</h2>
        <label htmlFor="invitation-heading">{birthdayCopy.heading}</label>
        <input
          id="invitation-heading"
          maxLength={contentSchema.heading.maxLength}
          value={content.heading}
          onChange={(event) => update({ heading: event.target.value })}
        />
        <label htmlFor="invitation-message">{birthdayCopy.message}</label>
        <textarea
          id="invitation-message"
          rows={5}
          maxLength={contentSchema.message.maxLength}
          aria-describedby="message-count"
          value={content.message}
          onChange={(event) => update({ message: event.target.value })}
        />
        <small id="message-count" className="character-count">
          {content.message.length} / {contentSchema.message.maxLength}
        </small>
      </section>
      <section aria-labelledby="date-fields">
        <h2 id="date-fields">Date & location</h2>
        <label htmlFor="event-local">{birthdayCopy.date}</label>
        <input
          id="event-local"
          type="datetime-local"
          min="1900-01-01T00:00"
          max="2200-12-31T23:59"
          value={content.event.localDateTime}
          onChange={(event) =>
            update({
              event: { ...content.event, localDateTime: event.target.value },
            })
          }
        />
        <label htmlFor="event-zone">{birthdayCopy.zone}</label>
        <input
          id="event-zone"
          list="time-zones"
          maxLength={contentSchema.event.properties.timeZone.maxLength}
          required
          value={content.event.timeZone}
          onChange={(event) =>
            update({
              event: { ...content.event, timeZone: event.target.value },
            })
          }
        />
        <datalist id="time-zones">
          {Array.from(
            new Set([
              "Europe/London",
              "UTC",
              ...Intl.supportedValuesOf("timeZone"),
            ]),
          ).map((zone) => (
            <option value={zone} key={zone} />
          ))}
        </datalist>
        <p className="field-help">{birthdayCopy.timeHelp}</p>
        <label htmlFor="event-venue">{birthdayCopy.venue}</label>
        <input
          id="event-venue"
          maxLength={contentSchema.venueName.maxLength}
          value={content.venueName}
          onChange={(event) => update({ venueName: event.target.value })}
        />
        <label htmlFor="event-address">{birthdayCopy.address}</label>
        <textarea
          id="event-address"
          rows={2}
          maxLength={contentSchema.address.maxLength}
          value={content.address}
          onChange={(event) => update({ address: event.target.value })}
        />
      </section>
      <section aria-labelledby="additional-fields">
        <h2 id="additional-fields">Additional details</h2>
        <label htmlFor="event-dress">{birthdayCopy.dress}</label>
        <input
          id="event-dress"
          maxLength={contentSchema.dressCode.maxLength}
          value={content.dressCode ?? ""}
          onChange={(event) => update({ dressCode: event.target.value })}
        />
        <label htmlFor="event-extra">{birthdayCopy.extra}</label>
        <textarea
          id="event-extra"
          rows={4}
          maxLength={contentSchema.additionalInfo.maxLength}
          aria-describedby="extra-count"
          value={content.additionalInfo ?? ""}
          onChange={(event) => update({ additionalInfo: event.target.value })}
        />
        <small id="extra-count" className="character-count">
          {content.additionalInfo?.length ?? 0} /{" "}
          {contentSchema.additionalInfo.maxLength}
        </small>
      </section>
      <RsvpSettings value={value} onChange={onChange} />
      <section aria-labelledby="appearance-fields">
        <h2 id="appearance-fields">Appearance</h2>
        <label htmlFor="birthday-palette">{birthdayCopy.palette}</label>
        <select
          id="birthday-palette"
          value={value.appearance.palette}
          onChange={(event) =>
            onChange({
              ...value,
              appearance: {
                palette: event.target
                  .value as BirthdayInvitationDraft["appearance"]["palette"],
              },
            })
          }
        >
          {palettes.map((palette) => (
            <option value={palette} key={palette}>
              {
                birthdayCopy.palettes[
                  palette as keyof typeof birthdayCopy.palettes
                ]
              }
            </option>
          ))}
        </select>
        <div className="palette-samples" aria-hidden="true">
          {palettes.map((palette) => (
            <span
              key={palette}
              data-palette={palette}
              className={value.appearance.palette === palette ? "selected" : ""}
            >
              <i />
              <i />
              <i />
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

export function BirthdayInvitationSummary({
  value,
}: {
  value: BirthdayInvitationDraft;
}) {
  return (
    <section
      className="birthday-summary"
      data-palette={value.appearance.palette}
      aria-label="Invitation draft summary"
    >
      <span className="birthday-summary-star" aria-hidden="true">
        ✳
      </span>
      <p>YOU’RE INVITED</p>
      <h2>{value.content.celebrantName || "Your name here"}</h2>
      {value.content.age !== undefined && (
        <span className="birthday-summary-age">
          TURNING {value.content.age}
        </span>
      )}
      <h3>{value.content.heading}</h3>
      <p>{value.content.message}</p>
      <small>Open the full-screen preview to see your saved invitation.</small>
    </section>
  );
}
