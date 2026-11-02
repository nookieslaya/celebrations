import type { Catalog } from "../api/client";

export type Template = Catalog["templates"][number];

export function paletteKey(template: Template): string {
  return Object.keys(template.allowedAppearance)[0];
}

export function selectedPalette(
  template: Template,
  choice: string | null,
): string {
  const key = paletteKey(template);
  const values = template.allowedAppearance[key] ?? [];
  const initial = template.initialDraft.appearance as Record<string, string>;
  return values.includes(choice ?? "") ? choice! : initial[key] || values[0];
}

export function withPalette(template: Template, palette: string, demo = false) {
  const draft = structuredClone(
    demo ? template.demoDraft : template.initialDraft,
  );
  const appearance = draft.appearance as Record<string, string>;
  appearance[paletteKey(template)] = palette;
  return draft;
}

export function PalettePicker({
  template,
  value,
  onChange,
}: {
  template: Template;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="gallery-palettes">
      <legend>Color palette · {template.paletteLabels[value]}</legend>
      {(template.allowedAppearance[paletteKey(template)] ?? []).map(
        (palette) => (
          <label key={palette} title={template.paletteLabels[palette]}>
            <input
              type="radio"
              name={`palette-${template.id}`}
              value={palette}
              checked={palette === value}
              onChange={() => onChange(palette)}
            />
            <span
              className="gallery-swatch"
              data-palette={palette}
              aria-hidden="true"
            />
            <span className="visually-hidden">
              {template.paletteLabels[palette]}
            </span>
          </label>
        ),
      )}
    </fieldset>
  );
}
