import type { EventValue, WeddingSection } from "./types";

export function sectionAnchor(section: WeddingSection): string | undefined {
  return /^[a-z][a-z0-9-]{0,63}$/.test(section.id)
    ? `wedding-section-${section.id}`
    : undefined;
}

export function eventMoment(event: EventValue): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(event.startsAt)) {
    return undefined;
  }
  const moment = new Date(event.startsAt);
  return Number.isFinite(moment.getTime()) ? moment : undefined;
}

export function formatEvent(
  event: EventValue,
  locale: string,
  timeOnly = false,
): string | undefined {
  const moment = eventMoment(event);
  if (!moment) {
    return undefined;
  }
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: event.timeZone,
      ...(timeOnly
        ? { timeStyle: "short" as const }
        : { dateStyle: "long" as const, timeStyle: "short" as const }),
    }).format(moment);
  } catch {
    return undefined;
  }
}

export function safeWebUrl(value: string | undefined): string | undefined {
  if (
    !value ||
    value.length > 4096 ||
    /[\\\s\u0000-\u001f\u007f]/u.test(value)
  ) {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}

export function mailLink(value: string | undefined): string | undefined {
  if (
    !value ||
    value.length > 254 ||
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) ||
    /[?&#%\u0000-\u001f\u007f]/u.test(value)
  ) {
    return undefined;
  }
  return `mailto:${encodeURIComponent(value)}`;
}

export function phoneLink(value: string | undefined): string | undefined {
  if (!value || !/^\+?[0-9 ()-]{3,40}$/.test(value)) {
    return undefined;
  }
  const number = value.replace(/[ ()-]/g, "");
  return /^\+?\d{3,}$/.test(number) ? `tel:${number}` : undefined;
}

export function hasText(...values: (string | undefined)[]) {
  return values.some((value) => Boolean(value?.trim()));
}
