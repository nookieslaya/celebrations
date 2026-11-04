import { useState } from "react";
import { ErrorNotice, Loading } from "../../components/Async";
import { appBase } from "../../config";
import type { WeddingDraft } from "../../generated/drafts";
import { LivePreview } from "../../preview/LivePreview";
import { Link } from "../../routing/Router";
import { AppearanceFields } from "./AppearanceFields";
import { useWeddingDevelopment, type WeddingDevelopment } from "./development";
import "./wedding-editor.css";

export function WeddingDemoView() {
  const resource = useWeddingDevelopment();
  if (resource.loading) {
    return <Loading />;
  }
  if (resource.error !== null || !resource.data) {
    return (
      <>
        <ErrorNotice error={resource.error} />
        <button type="button" className="button" onClick={resource.retry}>
          Retry demonstration
        </button>
      </>
    );
  }
  return <DemoDocument initial={resource.data} />;
}

function DemoDocument({ initial }: { initial: WeddingDevelopment }) {
  const [draft, setDraft] = useState<WeddingDraft>(() =>
    structuredClone(initial.demo.draft),
  );
  return (
    <div className="template-demo">
      <div className="template-demo-toolbar">
        <Link href={`${appBase}/sites`}>← Back to projects</Link>
        <strong>Demo · Modern Editorial</strong>
      </div>
      <p className="demo-notice">
        Administrator-only demonstration. Fictional people, venues and
        arrangements; illustrative stock photography. No project is created, no
        publication is made and no responses are collected.
      </p>
      <div className="wedding-demo-layout">
        <div className="panel-card">
          <AppearanceFields
            value={draft}
            onChange={setDraft}
            options={initial.options}
          />
        </div>
        <LivePreview
          document={{ ...initial.demo, draft }}
          mode="demo"
          mobileVisible
        />
      </div>
    </div>
  );
}
