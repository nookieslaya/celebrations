import schema from "../../../contracts/birthday-invitation.v1.json";
import type { BirthdayInvitationDraft } from "../generated/drafts";

const contract = schema.properties.content.properties.rsvp.properties;

export function RsvpSettings({
  value,
  onChange,
}: {
  value: BirthdayInvitationDraft;
  onChange: (value: BirthdayInvitationDraft) => void;
}) {
  const configuration = value.content.rsvp ?? {
    enabled: contract.enabled.default,
    maxPartySize: contract.maxPartySize.default,
    deadlineLocal: contract.deadlineLocal.default,
    deadlineAt: contract.deadlineAt.default,
  };
  function update(changes: Partial<typeof configuration>) {
    onChange({
      ...value,
      content: { ...value.content, rsvp: { ...configuration, ...changes } },
    });
  }
  return (
    <section aria-labelledby="rsvp-settings-heading">
      <h2 id="rsvp-settings-heading">RSVP settings</h2>
      <label htmlFor="rsvp-enabled">Accept RSVP responses</label>
      <input
        id="rsvp-enabled"
        type="checkbox"
        checked={configuration.enabled}
        onChange={(event) => update({ enabled: event.target.checked })}
      />
      <label htmlFor="rsvp-max">
        Maximum people per response, including the guest
      </label>
      <input
        id="rsvp-max"
        type="number"
        min={contract.maxPartySize.minimum}
        max={contract.maxPartySize.maximum}
        step={1}
        value={configuration.maxPartySize}
        onChange={(event) =>
          update({ maxPartySize: Number(event.target.value) })
        }
      />
      <label htmlFor="rsvp-deadline">RSVP deadline (optional)</label>
      <input
        id="rsvp-deadline"
        type="datetime-local"
        min="1900-01-01T00:00"
        max="2200-12-31T23:59"
        value={configuration.deadlineLocal}
        onChange={(event) => update({ deadlineLocal: event.target.value })}
      />
      <p className="field-help">
        Use the event time zone: {value.content.event.timeZone}. Without a
        deadline, RSVP closes when the event starts. Save and update the
        publication to apply these settings to guests.
      </p>
    </section>
  );
}
