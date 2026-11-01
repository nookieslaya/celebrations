import type { BasicPageDraft } from "../../generated/drafts";
import "./basic.css";

export default function BasicPage({
  value,
  label = "Page preview",
}: {
  value: BasicPageDraft;
  label?: string;
}) {
  return (
    <section
      className="draft-preview"
      data-accent={value.appearance.accent}
      aria-label={label}
    >
      <span className="preview-flower" aria-hidden="true">
        ✳
      </span>
      <h2>{value.content.heading}</h2>
      <p>{value.content.description}</p>
    </section>
  );
}
