import { useState } from "react";
import type { WeddingDraft } from "../../generated/drafts";
import { SectionForms } from "./SectionForms";
import { defaultSection, sectionNames, type WeddingSection } from "./model";

export function PageSections({
  projectId,
  value,
  onChange,
}: {
  projectId: number;
  value: WeddingDraft;
  onChange: (draft: WeddingDraft) => void;
}) {
  const [selectedId, setSelectedId] = useState(value.sections[0]?.id);
  const selected =
    value.sections.find((section) => section.id === selectedId) ??
    value.sections[0];
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
      <ol className="wedding-section-list">
        {value.sections.map((section, index) => {
          const fixed = section.type === "hero" || section.type === "footer";
          return (
            <li key={section.id}>
              <div className="wedding-actions">
                <button
                  type="button"
                  className="button"
                  aria-pressed={selected?.id === section.id}
                  onClick={() => setSelectedId(section.id)}
                >
                  Edit {sectionNames[section.type]}
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    disabled={fixed}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        sections: value.sections.map((current) =>
                          current.id === section.id
                            ? { ...current, enabled: event.target.checked }
                            : current,
                        ),
                      })
                    }
                  />
                  Enabled{fixed ? " (required)" : ""}
                </label>
                <button
                  type="button"
                  className="button"
                  aria-label={`Move ${sectionNames[section.type]} up`}
                  disabled={fixed || index <= 1}
                  onClick={() => move(section.id, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="button"
                  aria-label={`Move ${sectionNames[section.type]} down`}
                  disabled={fixed || index >= value.sections.length - 2}
                  onClick={() => move(section.id, 1)}
                >
                  Move down
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {missing.length > 0 && (
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
                setSelectedId(section.id);
              }}
            >
              Add {sectionNames[type]}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="wedding-section-form" key={selected.id}>
          <h3>{sectionNames[selected.type]}</h3>
          {!selected.enabled && (
            <p className="notice">
              This section is disabled. You can still edit and save its content.
            </p>
          )}
          <p className="field-help">
            Saved variant: {selected.variant}. Visual options will become
            available with their renderer.
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
