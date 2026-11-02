import schema from "../../../contracts/basic-page.v1.json";
import type { BasicPageDraft } from "../generated/drafts";
import { copy } from "../copy";

interface BasicPageFieldsProps {
  value: BasicPageDraft;
  onChange: (draft: BasicPageDraft) => void;
}

export function BasicPageFields({ value, onChange }: BasicPageFieldsProps) {
  const headingSchema = schema.properties.content.properties.heading;
  const descriptionSchema = schema.properties.content.properties.description;
  const palette = schema.properties.appearance.properties.accent.enum;

  return (
    <>
      <label htmlFor="heading">{copy.heading}</label>
      <input
        id="heading"
        required
        minLength={headingSchema.minLength}
        maxLength={headingSchema.maxLength}
        value={value.content.heading}
        onChange={(event) =>
          onChange({
            ...value,
            content: { ...value.content, heading: event.target.value },
          })
        }
      />
      <label htmlFor="description">{copy.description}</label>
      <textarea
        id="description"
        rows={6}
        maxLength={descriptionSchema.maxLength}
        value={value.content.description}
        onChange={(event) =>
          onChange({
            ...value,
            content: { ...value.content, description: event.target.value },
          })
        }
      />
      <label htmlFor="accent">{copy.accent}</label>
      <select
        id="accent"
        value={value.appearance.accent}
        onChange={(event) =>
          onChange({
            ...value,
            appearance: {
              ...value.appearance,
              accent: event.target
                .value as BasicPageDraft["appearance"]["accent"],
            },
          })
        }
      >
        {palette.map((accent) => (
          <option value={accent} key={accent}>
            {accent.charAt(0).toUpperCase() + accent.slice(1)}
          </option>
        ))}
      </select>
    </>
  );
}
