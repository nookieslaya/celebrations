import { useId } from "react";
import type { WeddingDraft } from "../../generated/drafts";
import type { WeddingOptions, WeddingOption } from "./development";

function OptionField<Id extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: WeddingOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
}) {
  const id = useId();
  const chosen = options.find((option) => option.id === value);
  return (
    <div className="wedding-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        aria-describedby={`${id}-description`}
        onChange={(event) => {
          const option = options.find(
            (candidate) => candidate.id === event.target.value,
          );
          if (option) {
            onChange(option.id);
          }
        }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <p className="field-help" id={`${id}-description`}>
        {chosen?.description}
      </p>
    </div>
  );
}

export function AppearanceFields({
  value,
  onChange,
  options,
}: {
  value: WeddingDraft;
  onChange: (draft: WeddingDraft) => void;
  options: WeddingOptions;
}) {
  const hero = value.sections.find((section) => section.type === "hero");
  return (
    <section aria-label="Appearance">
      <h2>Appearance</h2>
      <p>
        Modern Editorial · Development preview only. Changes remain private
        until you save.
      </p>
      {hero && (
        <OptionField
          label="Hero composition"
          options={options.heroVariants}
          value={hero.variant}
          onChange={(variant) =>
            onChange({
              ...value,
              sections: value.sections.map((section) =>
                section.id === hero.id && section.type === "hero"
                  ? { ...section, variant }
                  : section,
              ),
            })
          }
        />
      )}
      <OptionField
        label="Palette"
        options={options.palettes}
        value={value.appearance.palette}
        onChange={(palette) =>
          onChange({ ...value, appearance: { ...value.appearance, palette } })
        }
      />
      <OptionField
        label="Font pair"
        options={options.fontPairs}
        value={value.appearance.fontPair}
        onChange={(fontPair) =>
          onChange({ ...value, appearance: { ...value.appearance, fontPair } })
        }
      />
      <OptionField
        label="Opening"
        options={options.entrances}
        value={value.entrance.variant}
        onChange={(variant) => onChange({ ...value, entrance: { variant } })}
      />
    </section>
  );
}
