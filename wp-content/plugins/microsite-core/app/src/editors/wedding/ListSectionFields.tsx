import { MediaPicker } from "../../media/MediaPicker";
import { EventFields, ListFields, TextField, VenueSelect } from "./Fields";
import {
  emptyEvent,
  listLimit,
  stableId,
  textLimit,
  type SectionOf,
} from "./model";
import type { SectionFormProps } from "./SectionForms";

export function ListSectionFields({
  section,
  onChange,
  draft,
  projectId,
}: SectionFormProps) {
  switch (section.type) {
    case "schedule":
      return (
        <>
          <TextField
            label="Heading"
            value={section.content.heading}
            limit={textLimit("schedule", "heading")}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <ListFields<SectionOf<"schedule">["content"]["items"][number]>
            label="Schedule"
            items={section.content.items}
            limit={listLimit("schedule", "items")}
            createItem={() => ({
              id: stableId(),
              event: emptyEvent(draft.content.event.timeZone),
              title: "",
              description: "",
            })}
            onChange={(items) =>
              onChange({ ...section, content: { ...section.content, items } })
            }
          >
            {(item, update) => (
              <>
                <TextField
                  label="Title"
                  limit={textLimit("schedule", "title", "items")}
                  value={item.title}
                  onChange={(title) => update({ ...item, title })}
                />
                <TextField
                  label="Description"
                  multiline
                  limit={textLimit("schedule", "description", "items")}
                  value={item.description}
                  onChange={(description) => update({ ...item, description })}
                />
                <EventFields
                  value={item.event}
                  onChange={(event) => update({ ...item, event })}
                />
                <VenueSelect
                  value={item.venueId}
                  venues={draft.content.venues}
                  onChange={(venueId) => {
                    const next = { ...item };
                    if (venueId) {
                      next.venueId = venueId;
                    } else {
                      delete next.venueId;
                    }
                    update(next);
                  }}
                />
              </>
            )}
          </ListFields>
        </>
      );
    case "gallery":
      return (
        <>
          <TextField
            label="Heading"
            value={section.content.heading}
            limit={textLimit("gallery", "heading")}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <ListFields
            label="Photos"
            items={section.content.photos}
            limit={listLimit("gallery", "photos")}
            onChange={(photos) =>
              onChange({ ...section, content: { ...section.content, photos } })
            }
          >
            {(item, update) => (
              <MediaPicker
                projectId={projectId}
                value={item}
                onChange={(photo) => {
                  if (photo) {
                    update({ ...item, ...photo });
                  } else {
                    onChange({
                      ...section,
                      content: {
                        ...section.content,
                        photos: section.content.photos.filter(
                          (current) => current.id !== item.id,
                        ),
                      },
                    });
                  }
                }}
              />
            )}
          </ListFields>
          {section.content.photos.length < listLimit("gallery", "photos") && (
            <div className="wedding-list-item">
              <h4>Add a gallery photo</h4>
              <MediaPicker
                key={section.content.photos.length}
                projectId={projectId}
                onChange={(photo) => {
                  if (photo) {
                    onChange({
                      ...section,
                      content: {
                        ...section.content,
                        photos: [
                          ...section.content.photos,
                          { id: stableId(), ...photo },
                        ],
                      },
                    });
                  }
                }}
              />
            </div>
          )}
        </>
      );
    case "guest-info":
      return (
        <>
          <TextField
            label="Heading"
            value={section.content.heading}
            limit={textLimit("guest-info", "heading")}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <ListFields
            label="Information"
            items={section.content.items}
            limit={listLimit("guest-info", "items")}
            createItem={() => ({ id: stableId(), title: "", text: "" })}
            onChange={(items) =>
              onChange({ ...section, content: { ...section.content, items } })
            }
          >
            {(item, update) => (
              <>
                <TextField
                  label="Title"
                  limit={textLimit("guest-info", "title", "items")}
                  value={item.title}
                  onChange={(title) => update({ ...item, title })}
                />
                <TextField
                  label="Information"
                  multiline
                  limit={textLimit("guest-info", "text", "items")}
                  value={item.text}
                  onChange={(text) => update({ ...item, text })}
                />
              </>
            )}
          </ListFields>
        </>
      );
    case "travel":
      return (
        <>
          <TextField
            label="Heading"
            value={section.content.heading}
            limit={textLimit("travel", "heading")}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <TextField
            label="Description"
            multiline
            value={section.content.description}
            limit={textLimit("travel", "description")}
            onChange={(description) =>
              onChange({
                ...section,
                content: { ...section.content, description },
              })
            }
          />
          <ListFields<SectionOf<"travel">["content"]["items"][number]>
            label="Travel options"
            items={section.content.items}
            limit={listLimit("travel", "items")}
            createItem={() => ({ id: stableId(), name: "", description: "" })}
            onChange={(items) =>
              onChange({ ...section, content: { ...section.content, items } })
            }
          >
            {(item, update) => (
              <>
                <TextField
                  label="Name"
                  limit={textLimit("travel", "name", "items")}
                  value={item.name}
                  onChange={(name) => update({ ...item, name })}
                />
                <TextField
                  label="Description"
                  multiline
                  limit={textLimit("travel", "description", "items")}
                  value={item.description}
                  onChange={(description) => update({ ...item, description })}
                />
                <TextField
                  label="HTTP(S) link (optional)"
                  type="url"
                  limit={textLimit("travel", "url", "items")}
                  value={item.url ?? ""}
                  onChange={(url) => {
                    const next = { ...item };
                    if (url) {
                      next.url = url;
                    } else {
                      delete next.url;
                    }
                    update(next);
                  }}
                />
              </>
            )}
          </ListFields>
        </>
      );
    case "gifts":
      return (
        <>
          <TextField
            label="Heading"
            value={section.content.heading}
            limit={textLimit("gifts", "heading")}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <TextField
            label="Gift information"
            multiline
            value={section.content.text}
            limit={textLimit("gifts", "text")}
            onChange={(text) =>
              onChange({ ...section, content: { ...section.content, text } })
            }
          />
          <ListFields
            label="Gift links"
            items={section.content.links}
            limit={listLimit("gifts", "links")}
            createItem={() => ({ id: stableId(), label: "", url: "" })}
            onChange={(links) =>
              onChange({ ...section, content: { ...section.content, links } })
            }
          >
            {(item, update) => (
              <>
                <TextField
                  label="Label"
                  limit={textLimit("gifts", "label", "links")}
                  value={item.label}
                  onChange={(label) => update({ ...item, label })}
                />
                <TextField
                  label="HTTP(S) link"
                  type="url"
                  limit={textLimit("gifts", "url", "links")}
                  value={item.url}
                  onChange={(url) => update({ ...item, url })}
                />
              </>
            )}
          </ListFields>
        </>
      );
    case "faq":
      return (
        <>
          <TextField
            label="Heading"
            value={section.content.heading}
            limit={textLimit("faq", "heading")}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <ListFields
            label="Questions"
            items={section.content.items}
            limit={listLimit("faq", "items")}
            createItem={() => ({ id: stableId(), question: "", answer: "" })}
            onChange={(items) =>
              onChange({ ...section, content: { ...section.content, items } })
            }
          >
            {(item, update) => (
              <>
                <TextField
                  label="Question"
                  limit={textLimit("faq", "question", "items")}
                  value={item.question}
                  onChange={(question) => update({ ...item, question })}
                />
                <TextField
                  label="Answer"
                  multiline
                  limit={textLimit("faq", "answer", "items")}
                  value={item.answer}
                  onChange={(answer) => update({ ...item, answer })}
                />
              </>
            )}
          </ListFields>
        </>
      );
    case "contact":
      return (
        <>
          <TextField
            label="Heading"
            value={section.content.heading}
            limit={textLimit("contact", "heading")}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <ListFields<SectionOf<"contact">["content"]["contacts"][number]>
            label="Contacts"
            items={section.content.contacts}
            limit={listLimit("contact", "contacts")}
            createItem={() => ({ id: stableId(), name: "" })}
            onChange={(contacts) =>
              onChange({
                ...section,
                content: { ...section.content, contacts },
              })
            }
          >
            {(item, update) => (
              <>
                <TextField
                  label="Name"
                  limit={textLimit("contact", "name", "contacts")}
                  value={item.name}
                  onChange={(name) => update({ ...item, name })}
                />
                <TextField
                  label="Email (optional)"
                  type="email"
                  limit={textLimit("contact", "email", "contacts")}
                  value={item.email ?? ""}
                  onChange={(email) => {
                    const next = { ...item };
                    if (email) {
                      next.email = email;
                    } else {
                      delete next.email;
                    }
                    update(next);
                  }}
                />
                <TextField
                  label="Phone (optional)"
                  type="tel"
                  limit={textLimit("contact", "phone", "contacts")}
                  value={item.phone ?? ""}
                  onChange={(phone) => {
                    const next = { ...item };
                    if (phone) {
                      next.phone = phone;
                    } else {
                      delete next.phone;
                    }
                    update(next);
                  }}
                />
              </>
            )}
          </ListFields>
        </>
      );
    default:
      return null;
  }
}
