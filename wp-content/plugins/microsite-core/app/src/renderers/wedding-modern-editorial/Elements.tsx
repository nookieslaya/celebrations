import type { ReactNode } from "react";
import { formatEvent, sectionAnchor } from "./format";
import type { EventValue, WeddingSection } from "./types";

export function SectionShell({
  section,
  title,
  label,
  className = "",
  children,
}: {
  section: WeddingSection;
  title?: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const anchor = sectionAnchor(section);
  if (!anchor) {
    return null;
  }
  return (
    <section
      className={`me-section ${className}`}
      id={anchor}
      aria-labelledby={`${anchor}-heading`}
    >
      <div className="me-container">
        <header className="me-section-heading">
          <p className="me-kicker">{label}</p>
          <h2
            id={`${anchor}-heading`}
            className={title?.trim() ? undefined : "me-sr-only"}
          >
            {title?.trim() || label}
          </h2>
        </header>
        {children}
      </div>
    </section>
  );
}

export function Copy({
  text,
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  if (!text?.trim()) {
    return null;
  }
  return <p className={`me-copy ${className}`}>{text}</p>;
}

export function EventTime({
  value,
  locale,
  timeOnly = false,
}: {
  value: EventValue;
  locale: string;
  timeOnly?: boolean;
}) {
  const formatted = formatEvent(value, locale, timeOnly);
  return formatted ? <time dateTime={value.startsAt}>{formatted}</time> : null;
}

export function Arrow() {
  return (
    <svg
      width="22"
      height="16"
      viewBox="0 0 22 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 8h19M13 1l7 7-7 7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
