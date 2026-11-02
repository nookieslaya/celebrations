interface EventValue {
  localDateTime: string;
  timeZone: string;
  startsAt: string;
}

/** Presentation only. The backend remains responsible for timezone/DST validation. */
export function formatEvent(
  event: EventValue,
  options: Intl.DateTimeFormatOptions,
  preview = false,
): string | null {
  try {
    // Invalid IANA identifiers must never break an unfinished preview.
    new Intl.DateTimeFormat("en-GB", { timeZone: event.timeZone }).format(0);
    let date: Date;
    let timeZone = event.timeZone;
    if (preview) {
      const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(
        event.localDateTime,
      );
      if (!match) {
        return null;
      }
      const [year, month, day, hour, minute] = match.slice(1).map(Number);
      date = new Date(0);
      date.setUTCFullYear(year, month - 1, day);
      date.setUTCHours(hour, minute, 0, 0);
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day ||
        date.getUTCHours() !== hour ||
        date.getUTCMinutes() !== minute
      ) {
        return null;
      }
      // Format the entered wall-clock fields without inventing a saved UTC instant.
      timeZone = "UTC";
    } else {
      date = new Date(event.startsAt);
    }
    if (!Number.isFinite(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(
      date,
    );
  } catch {
    return null;
  }
}
