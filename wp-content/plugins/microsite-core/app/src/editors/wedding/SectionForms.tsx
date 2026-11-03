import { useId } from "react";
import type { WeddingDraft } from "../../generated/drafts";
import { MediaPicker } from "../../media/MediaPicker";
import { TextField } from "./Fields";
import { ListSectionFields } from "./ListSectionFields";
import { textLimit, type WeddingSection } from "./model";

export interface SectionFormProps {
  projectId: number;
  draft: WeddingDraft;
  section: WeddingSection;
  onChange: (section: WeddingSection) => void;
}

export function SectionForms(props: SectionFormProps) {
  const { section, onChange, projectId, draft } = props;
  const id = useId();
  switch (section.type) {
    case "hero":
      return (
        <>
          <p>
            Names and date come from Wedding details. Composition{" "}
            {section.variant} is a development setting; visual variants arrive
            in W3.
          </p>
          <TextField
            label="Subtitle"
            limit={textLimit("hero", "subtitle")}
            value={section.content.subtitle}
            onChange={(subtitle) =>
              onChange({
                ...section,
                content: { ...section.content, subtitle },
              })
            }
          />
          <label htmlFor={`${id}-cta`}>CTA destination</label>
          <select
            id={`${id}-cta`}
            value={section.content.cta}
            onChange={(event) =>
              onChange({
                ...section,
                content: {
                  ...section.content,
                  cta: event.target.value as typeof section.content.cta,
                },
              })
            }
          >
            <option value="none">None</option>
            <option value="rsvp">RSVP (connection in W5)</option>
            <option value="venues">Venues</option>
            <option value="schedule">Schedule</option>
          </select>
          <MediaPicker
            projectId={projectId}
            value={section.content.photo}
            onChange={(photo) => {
              const content = { ...section.content };
              if (photo) {
                content.photo = photo;
              } else {
                delete content.photo;
              }
              onChange({ ...section, content });
            }}
          />
        </>
      );
    case "invitation":
      return (
        <>
          <TextField
            label="Heading"
            limit={textLimit("invitation", "heading")}
            value={section.content.heading}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <TextField
            label="Invitation text"
            multiline
            limit={textLimit("invitation", "text")}
            value={section.content.text}
            onChange={(text) =>
              onChange({ ...section, content: { ...section.content, text } })
            }
          />
        </>
      );
    case "countdown":
      return (
        <>
          <TextField
            label="Heading"
            limit={textLimit("countdown", "heading")}
            value={section.content.heading}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <p>The countdown will use the main date from Wedding details.</p>
        </>
      );
    case "venues":
      return (
        <>
          <TextField
            label="Heading"
            limit={textLimit("venues", "heading")}
            value={section.content.heading}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <p>
            Select shared venues. Edit their names, addresses and dates in
            Wedding details.
          </p>
          {draft.content.venues.map((venue) => (
            <label key={venue.id}>
              <input
                type="checkbox"
                checked={section.content.venueIds.includes(venue.id)}
                onChange={(event) =>
                  onChange({
                    ...section,
                    content: {
                      ...section.content,
                      venueIds: event.target.checked
                        ? [...section.content.venueIds, venue.id]
                        : section.content.venueIds.filter(
                            (current) => current !== venue.id,
                          ),
                    },
                  })
                }
              />
              {venue.name || "Unnamed venue"}
            </label>
          ))}
          {draft.content.venues.length === 0 && (
            <p>Add a venue in Wedding details first.</p>
          )}
        </>
      );
    case "story":
      return (
        <>
          <TextField
            label="Heading"
            limit={textLimit("story", "heading")}
            value={section.content.heading}
            onChange={(heading) =>
              onChange({ ...section, content: { ...section.content, heading } })
            }
          />
          <TextField
            label="Our story"
            multiline
            limit={textLimit("story", "text")}
            value={section.content.text}
            onChange={(text) =>
              onChange({ ...section, content: { ...section.content, text } })
            }
          />
          <MediaPicker
            projectId={projectId}
            value={section.content.photo}
            onChange={(photo) => {
              const content = { ...section.content };
              if (photo) {
                content.photo = photo;
              } else {
                delete content.photo;
              }
              onChange({ ...section, content });
            }}
          />
        </>
      );
    case "rsvp":
      return (
        <>
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
          <p className="notice">
            The shared RSVP module will be connected in W5. No guest responses
            can be submitted for this development project.
          </p>
        </>
      );
    case "footer":
      return (
        <TextField
          label="Closing text"
          multiline
          limit={textLimit("footer", "text")}
          value={section.content.text}
          onChange={(text) => onChange({ ...section, content: { text } })}
        />
      );
    default:
      return <ListSectionFields {...props} />;
  }
}
