import { useId } from "react";
import schema from "../../../../contracts/wedding.v1.json";
import type { WeddingDraft } from "../../generated/drafts";
import {
  fontPairLabels,
  paletteLabels,
} from "../../renderers/wedding-modern-editorial/style";

export function AppearanceFields({
  value,
  onChange,
}: {
  value: WeddingDraft;
  onChange: (draft: WeddingDraft) => void;
}) {
  const id = useId();
  return (
    <section aria-label="Appearance">
      <h2>Appearance</h2>
      <p>
        Modern Editorial · Development preview only. Save the draft to view your
        choices.
      </p>
      <label htmlFor={`${id}-palette`}>Palette</label>
      <select
        id={`${id}-palette`}
        value={value.appearance.palette}
        onChange={(event) =>
          onChange({
            ...value,
            appearance: {
              ...value.appearance,
              palette: event.target
                .value as WeddingDraft["appearance"]["palette"],
            },
          })
        }
      >
        {schema.properties.appearance.properties.palette.enum.map((palette) => (
          <option key={palette} value={palette}>
            {paletteLabels[palette as WeddingDraft["appearance"]["palette"]]}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-font`}>Font pair</label>
      <select
        id={`${id}-font`}
        value={value.appearance.fontPair}
        onChange={(event) =>
          onChange({
            ...value,
            appearance: {
              ...value.appearance,
              fontPair: event.target
                .value as WeddingDraft["appearance"]["fontPair"],
            },
          })
        }
      >
        {schema.properties.appearance.properties.fontPair.enum.map((pair) => (
          <option key={pair} value={pair}>
            {fontPairLabels[pair as WeddingDraft["appearance"]["fontPair"]]}
          </option>
        ))}
      </select>
      <p className="field-help">
        Saved entrance: {value.entrance.variant}. Animated entrances will be
        available in W4.
      </p>
    </section>
  );
}
