import type { WeddingDraft } from "../../generated/drafts";
import { PageSections } from "./PageSections";
import { WeddingDetails } from "./WeddingDetails";
import "./wedding-editor.css";

export function WeddingFields({
  projectId,
  value,
  onChange,
}: {
  projectId?: number;
  value: WeddingDraft;
  onChange: (draft: WeddingDraft) => void;
}) {
  if (!projectId) {
    return (
      <p className="notice">
        Save a development project before opening this editor.
      </p>
    );
  }
  return (
    <div className="wedding-editor">
      <p className="notice">
        Wedding development editor · Publishing remains unavailable.
      </p>
      <WeddingDetails value={value} onChange={onChange} />
      <PageSections projectId={projectId} value={value} onChange={onChange} />
      <section aria-label="Appearance">
        <h2>Appearance</h2>
        <dl>
          <dt>Palette</dt>
          <dd>{value.appearance.palette}</dd>
          <dt>Font pair</dt>
          <dd>{value.appearance.fontPair}</dd>
          <dt>Entrance</dt>
          <dd>{value.entrance.variant}</dd>
        </dl>
        <p>
          These are saved development settings. Visual choices and Modern
          Editorial will be available in the next stages.
        </p>
      </section>
    </div>
  );
}
