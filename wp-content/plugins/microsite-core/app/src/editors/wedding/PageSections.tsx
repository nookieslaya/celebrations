import type { WeddingDraft } from "../../generated/drafts";
import { SectionForms } from "./SectionForms";
import {
  defaultRsvpSettings,
  defaultSection,
  sectionNames,
  type WeddingSection,
} from "./model";

export function PageSections({
  projectId,
  value,
  onChange,
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  projectId: number;
  value: WeddingDraft;
  onChange: (draft: WeddingDraft) => void;
}) {
  const selected =
    value.sections.find((section) => section.id === selectedId) ??
    value.sections[0];
  const selectedIndex = value.sections.findIndex(
    (section) => section.id === selected?.id,
  );
  const fixedSection = selected?.type === "hero" || selected?.type === "footer";
  const missing = (
    Object.keys(sectionNames) as WeddingSection["type"][]
  ).filter((type) => !value.sections.some((section) => section.type === type));

  function move(id: string, direction: number) {
    const index = value.sections.findIndex((section) => section.id === id);
    const destination = index + direction;
    if (
      index <= 0 ||
      index >= value.sections.length - 1 ||
      destination <= 0 ||
      destination >= value.sections.length - 1
    ) {
      return;
    }
    const sections = [...value.sections];
    [sections[index], sections[destination]] = [
      sections[destination],
      sections[index],
    ];
    onChange({ ...value, sections });
  }

  return (
    <section aria-label="Page sections">
      <h2>Page sections</h2>
      <p>
        Changes are local until you save the draft. Disabled sections keep their
        content and position.
      </p>
      {selected && (
        <div className="wedding-actions" aria-label="Selected section actions">
          <label>
            <input
              type="checkbox"
              checked={
                selected.enabled &&
                (selected.type !== "rsvp" || Boolean(selected.content.settings))
              }
              disabled={fixedSection}
              onChange={(event) =>
                onChange({
                  ...value,
                  sections: value.sections.map((current) =>
                    current.id === selected.id
                      ? enableSection(current, event.target.checked)
                      : current,
                  ),
                })
              }
            />
            Enabled{fixedSection ? " (required)" : ""}
          </label>
          <button
            type="button"
            className="button"
            disabled={fixedSection || selectedIndex <= 1}
            onClick={() => move(selected.id, -1)}
          >
            Move up
          </button>
          <button
            type="button"
            className="button"
            disabled={
              fixedSection || selectedIndex >= value.sections.length - 2
            }
            onClick={() => move(selected.id, 1)}
          >
            Move down
          </button>
        </div>
      )}
      {missing.length > 0 && (
        <details>
          <summary>Add a section</summary>
          <div className="wedding-actions" aria-label="Available sections">
            {missing.map((type) => (
              <button
                key={type}
                type="button"
                className="button"
                onClick={() => {
                  const section = { ...defaultSection(type), enabled: true };
                  const sections = [...value.sections];
                  sections.splice(sections.length - 1, 0, section);
                  onChange({ ...value, sections });
                  onSelect(section.id);
                }}
              >
                Add {sectionNames[type]}
              </button>
            ))}
          </div>
        </details>
      )}
      {selected && (
        <div
          className="wedding-section-form"
          key={selected.id}
          data-wedding-section={selected.id}
        >
          <h3>{sectionNames[selected.type]}</h3>
          {!selected.enabled && (
            <p className="notice">
              This section is disabled. You can still edit and save its content.
            </p>
          )}
          <p className="field-help">
            This section keeps its content when its appearance changes.
          </p>
          <SectionForms
            projectId={projectId}
            draft={value}
            section={selected}
            onChange={(updated) =>
              onChange({
                ...value,
                sections: value.sections.map((current) =>
                  current.id === updated.id ? updated : current,
                ),
              })
            }
          />
        </div>
      )}
    </section>
  );
}

function enableSection(
  section: WeddingSection,
  enabled: boolean,
): WeddingSection {
  if (section.type === "rsvp" && enabled) {
    return {
      ...section,
      enabled,
      content: {
        ...section.content,
        settings: section.content.settings ?? defaultRsvpSettings(),
      },
    };
  }
  return { ...section, enabled };
}
