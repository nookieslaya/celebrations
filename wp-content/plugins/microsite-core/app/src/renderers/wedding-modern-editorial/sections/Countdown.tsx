import { useEffect, useState } from "react";
import { SectionShell } from "../Elements";
import { eventMoment } from "../format";
import type { SectionProps } from "../types";

export function Countdown({ section, context }: SectionProps<"countdown">) {
  const target = eventMoment(context.draft.content.event)?.getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!context.active || target === undefined || Date.now() >= target) {
      return;
    }
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= target) {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [target, context.active]);

  if (target === undefined) {
    return null;
  }
  const remaining = Math.max(0, Math.floor((target - now) / 1000));
  const values = [
    { label: "Days", value: Math.floor(remaining / 86400) },
    { label: "Hours", value: Math.floor(remaining / 3600) % 24 },
    { label: "Minutes", value: Math.floor(remaining / 60) % 60 },
    { label: "Seconds", value: remaining % 60 },
  ];
  return (
    <SectionShell
      section={section}
      title={section.content.heading}
      label="Counting the moments"
      className="me-countdown-section"
    >
      {remaining === 0 ? (
        <p className="me-countdown-message">
          The day we have been waiting for is here.
        </p>
      ) : (
        <dl
          className="me-countdown"
          aria-label="Time until the wedding"
          aria-live="off"
        >
          {values.map((item) => (
            <div key={item.label}>
              <dd>{String(item.value).padStart(2, "0")}</dd>
              <dt>{item.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </SectionShell>
  );
}
