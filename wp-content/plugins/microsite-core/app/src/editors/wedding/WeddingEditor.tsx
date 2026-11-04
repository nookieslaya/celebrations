import { useEffect, useRef, useState } from "react";
import { sectionNames } from "./model";
import { weddingFocusEvent } from "./readiness";
import { ErrorNotice, Loading } from "../../components/Async";
import { useWeddingDevelopment } from "./development";
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
  const development = useWeddingDevelopment();
  const [selectedId, setSelectedId] = useState("details");
  const [navigationOpen, setNavigationOpen] = useState(
    () => !matchMedia("(max-width: 900px)").matches,
  );
  const workspace = useRef<HTMLDivElement>(null);
  const selectionNeedsFocus = useRef(false);

  useEffect(() => {
    if (!selectionNeedsFocus.current) {
      return;
    }
    selectionNeedsFocus.current = false;
    const heading = workspace.current?.querySelector<HTMLElement>(
      ".wedding-edit-area > div:not([hidden]) h2",
    );
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [selectedId, navigationOpen]);

  useEffect(() => {
    const narrow = matchMedia("(max-width: 900px)");
    const collapse = () => {
      if (narrow.matches) {
        setNavigationOpen(false);
      }
    };
    narrow.addEventListener("change", collapse);
    return () => narrow.removeEventListener("change", collapse);
  }, []);

  function select(id: string) {
    selectionNeedsFocus.current = true;
    setSelectedId(id);
    if (matchMedia("(max-width: 900px)").matches) {
      setNavigationOpen(false);
    }
  }

  useEffect(() => {
    let frame: number | undefined;
    const receive = (event: Event) => {
      if (
        !(event instanceof CustomEvent) ||
        event.detail?.projectId !== projectId ||
        typeof event.detail.path !== "string"
      ) {
        return;
      }
      const path: string = event.detail.path;
      const section = /^sections\.([a-z][a-z0-9-]{0,63})(?:\.|$)/.exec(path);
      const id = section
        ? section[1]
        : path.startsWith("appearance.") || path.startsWith("entrance.")
          ? "appearance"
          : "details";
      setSelectedId(id);
      if (matchMedia("(max-width: 900px)").matches) {
        setNavigationOpen(false);
      }
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        const target = workspace.current?.querySelector<HTMLElement>(
          ".wedding-edit-area > div:not([hidden]) h2, .wedding-edit-area > div:not([hidden]) h3",
        );
        if (target) {
          target.tabIndex = -1;
          target.focus();
          target.scrollIntoView({ block: "center" });
        }
      });
    };
    window.addEventListener(weddingFocusEvent, receive);
    return () => {
      window.removeEventListener(weddingFocusEvent, receive);
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [projectId]);
  if (development.loading) {
    return <Loading />;
  }
  if (development.error !== null || !development.data) {
    return (
      <>
        <ErrorNotice error={development.error} />
        <button type="button" className="button" onClick={development.retry}>
          Retry wedding options
        </button>
      </>
    );
  }
  if (!projectId) {
    return (
      <p className="notice">
        Save a development project before opening this editor.
      </p>
    );
  }
  return (
    <div className="wedding-editor" ref={workspace}>
      <div className="wedding-navigation-toggle">
        <button
          type="button"
          className="button"
          aria-expanded={navigationOpen}
          aria-controls={`wedding-navigation-${projectId}`}
          onClick={() => setNavigationOpen((open) => !open)}
        >
          Sections
        </button>
        <span>
          {selectedId === "details"
            ? "Wedding details"
            : selectedId === "appearance"
              ? "Appearance"
              : sectionNames[
                  value.sections.find((section) => section.id === selectedId)
                    ?.type ?? "hero"
                ]}
        </span>
      </div>
      <div className="wedding-workspace" data-navigation-open={navigationOpen}>
        <nav
          id={`wedding-navigation-${projectId}`}
          className="wedding-navigation"
          aria-label="Wedding editor sections"
          hidden={!navigationOpen}
        >
          <button
            type="button"
            aria-current={selectedId === "details" ? "page" : undefined}
            onClick={() => select("details")}
          >
            Wedding details
          </button>
          <ol>
            {value.sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  aria-current={selectedId === section.id ? "page" : undefined}
                  onClick={() => select(section.id)}
                >
                  <span>{sectionNames[section.type]}</span>
                  <small>
                    {section.enabled &&
                    (section.type !== "rsvp" ||
                      Boolean(section.content.settings))
                      ? "On"
                      : "Off"}
                  </small>
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            aria-current={selectedId === "appearance" ? "page" : undefined}
            onClick={() => select("appearance")}
          >
            Appearance
          </button>
        </nav>
        <div className="wedding-edit-area">
          <div hidden={selectedId !== "details"}>
            <WeddingDetails value={value} onChange={onChange} />
          </div>
          <div hidden={selectedId === "details" || selectedId === "appearance"}>
            <PageSections
              projectId={projectId}
              value={value}
              onChange={onChange}
              selectedId={selectedId}
              onSelect={select}
            />
          </div>
          <div hidden={selectedId !== "appearance"}>
            <AppearanceFields
              value={value}
              onChange={onChange}
              options={development.data.options}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
