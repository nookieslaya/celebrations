import type { WeddingDraft } from "../../generated/drafts";
import { AppearanceFields } from "./AppearanceFields";
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
      <AppearanceFields value={value} onChange={onChange} />
    </div>
  );
}
