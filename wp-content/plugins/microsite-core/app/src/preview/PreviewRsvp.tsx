import { useState } from "react";
import { GuestFields } from "../rsvp/GuestFields";
import type { GuestPayload } from "../rsvp/api";
import "../rsvp/rsvp.css";

/** The public form's fields and classes, without its API, secrets or submit handler. */
export function PreviewRsvp({ maximum }: { maximum: number }) {
  const [value, setValue] = useState<GuestPayload>({
    name: "",
    attending: "yes",
    partySize: 1,
  });
  const limit = Number.isFinite(maximum)
    ? Math.max(1, Math.min(20, maximum))
    : 1;
  return (
    <section className="rsvp-card" aria-labelledby="guest-rsvp-heading">
      <h2 id="guest-rsvp-heading">RSVP</h2>
      <form onSubmit={(event) => event.preventDefault()}>
        <fieldset>
          <GuestFields value={value} onChange={setValue} maximum={limit} />
          <button type="button" disabled>
            Send RSVP
          </button>
        </fieldset>
      </form>
      <p role="note">Preview only — guest responses cannot be sent.</p>
    </section>
  );
}
