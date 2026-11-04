import { Arrow, Copy, SectionShell } from "../Elements";
import { hasText, mailLink, phoneLink, safeWebUrl } from "../format";
import type { SectionProps } from "../types";

export function GuestInfo({ section }: SectionProps<"guest-info">) {
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="Good to know"
      className="me-guest-info-section"
    >
      <div className="me-information">
        {section.content.items
          .filter((item) => hasText(item.title, item.text))
          .map((item) => (
            <article key={item.id}>
              {item.title.trim() && <h3>{item.title}</h3>}
              <Copy text={item.text} />
            </article>
          ))}
      </div>
    </SectionShell>
  );
}

export function Travel({ section }: SectionProps<"travel">) {
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="Getting here, staying close"
      className="me-travel-section"
    >
      <Copy text={section.content.description} />
      <div className="me-travel-options">
        {section.content.items
          .filter(
            (item) =>
              hasText(item.name, item.description) || safeWebUrl(item.url),
          )
          .map((item) => {
            const url = safeWebUrl(item.url);
            return (
              <article key={item.id}>
                {item.name.trim() && <h3>{item.name}</h3>}
                <Copy text={item.description} />
                {url && (
                  <a
                    className="me-text-link"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    More information
                    <Arrow />
                  </a>
                )}
              </article>
            );
          })}
      </div>
    </SectionShell>
  );
}

export function Faq({ section }: SectionProps<"faq">) {
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="A few answers"
      className="me-faq-section"
    >
      <div className="me-faq">
        {section.content.items
          .filter((item) => hasText(item.question, item.answer))
          .map((item) =>
            item.question.trim() ? (
              <details key={item.id}>
                <summary>
                  {item.question}
                  <span aria-hidden="true" className="me-faq-marker" />
                </summary>
                <Copy text={item.answer} />
              </details>
            ) : (
              <div key={item.id} className="me-faq-answer">
                <Copy text={item.answer} />
              </div>
            ),
          )}
      </div>
    </SectionShell>
  );
}

export function Rsvp({ section, context }: SectionProps<"rsvp">) {
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="Will you join us?"
      className="me-rsvp-section"
    >
      <Copy text={section.content.text} />
      {context.rsvp}
      {context.preview && !context.rsvp && (
        <p className="me-development-note">
          RSVP is not configured. Enable guest responses in the RSVP section to
          preview the form. No responses are sent from a private preview.
        </p>
      )}
    </SectionShell>
  );
}

export function Contact({ section }: SectionProps<"contact">) {
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="Keep in touch"
      className="me-contact-section"
    >
      <div className="me-contacts">
        {section.content.contacts
          .filter(
            (contact) =>
              contact.name.trim() ||
              mailLink(contact.email) ||
              phoneLink(contact.phone),
          )
          .map((contact) => {
            const email = mailLink(contact.email);
            const phone = phoneLink(contact.phone);
            return (
              <article key={contact.id}>
                {contact.name.trim() && <h3>{contact.name}</h3>}
                {email && <a href={email}>{contact.email}</a>}
                {phone && <a href={phone}>{contact.phone}</a>}
              </article>
            );
          })}
      </div>
    </SectionShell>
  );
}
