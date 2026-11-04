import { useId } from "react";
import schema from "../../../../contracts/wedding.v1.json";
import { TextField } from "./Fields";
import { defaultRsvpSettings, textLimit, type SectionOf } from "./model";

export function WeddingRsvpFields({
  section,
  timeZone,
  onChange,
}: {
  section: SectionOf<"rsvp">;
  timeZone: string;
  onChange: (section: SectionOf<"rsvp">) => void;
}) {
  const id = useId();
  const settings = section.content.settings;
  const constraints = schema.properties.sections.items.oneOf.find(
    (branch) => branch.properties.type.enum[0] === "rsvp",
  )?.properties.content.properties.settings?.properties;
  if (!constraints) {
    throw new Error("Missing wedding RSVP settings schema.");
  }
  return (
    <>
      <p>
        One response covers the whole celebration. The number of guests includes
        the person replying.
      </p>
      <TextField
        label="Heading"
        limit={textLimit("rsvp", "heading")}
        value={section.content.heading}
        onChange={(heading) =>
          onChange({ ...section, content: { ...section.content, heading } })
        }
      />
      <TextField
        label="Introduction"
        multiline
        limit={textLimit("rsvp", "text")}
        value={section.content.text}
        onChange={(text) =>
          onChange({ ...section, content: { ...section.content, text } })
        }
      />
      <label>
        <input
          type="checkbox"
          checked={section.enabled && Boolean(settings)}
          onChange={(event) =>
            onChange({
              ...section,
              enabled: event.target.checked,
              content: {
                ...section.content,
                ...(event.target.checked
                  ? { settings: settings ?? defaultRsvpSettings() }
                  : {}),
              },
            })
          }
        />
        Accept guest responses
      </label>
      {!settings && (
        <p className="notice">
          This older draft has no functional RSVP settings. Responses stay off
          until you explicitly enable them.
        </p>
      )}
      {settings && (
        <>
          <label htmlFor={`${id}-maximum`}>
            Maximum participants per response (including the person replying)
          </label>
          <input
            id={`${id}-maximum`}
            type="number"
            min={constraints.maxPartySize.minimum}
            max={constraints.maxPartySize.maximum}
            step={1}
            value={settings.maxPartySize}
            onChange={(event) => {
              const maxPartySize = event.target.valueAsNumber;
              if (Number.isInteger(maxPartySize)) {
                onChange({
                  ...section,
                  content: {
                    ...section.content,
                    settings: { ...settings, maxPartySize },
                  },
                });
              }
            }}
          />
          <label htmlFor={`${id}-deadline`}>
            Reply deadline (optional) · {timeZone}
          </label>
          <input
            id={`${id}-deadline`}
            type="datetime-local"
            step={60}
            value={settings.deadlineLocal}
            onChange={(event) =>
              onChange({
                ...section,
                content: {
                  ...section.content,
                  settings: {
                    ...settings,
                    deadlineLocal: event.target.value,
                    deadlineAt: "",
                  },
                },
              })
            }
          />
          <p className="field-help">
            Times use the main event's IANA zone. With no deadline, replies
            close when the event starts. The server checks daylight-saving time
            and the event boundary when saving.
          </p>
        </>
      )}
      <p className="field-help">
        Disabling this section disables new public replies after you publish the
        update. Existing responses remain available in Manage responses.
      </p>
    </>
  );
}
