/**
 * js/components/date-format.js – Absolute and relative date formatting.
 * Depends on: js/config/strings.js.
 */

import { STRINGS } from "../config/strings.js";

/** Formats an ISO date as a localized absolute date and relative label. */
export function formatDate(dateValue, now = new Date()) {
  if (!dateValue) return { absolute: STRINGS.shared.noDate, relative: "" };
  const dateOnly = typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
  let date;
  if (dateOnly) {
    const [year, month, day] = dateValue.split("-").map(Number);
    date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return { absolute: STRINGS.shared.noDate, relative: "" };
    }
  } else {
    date = new Date(dateValue);
  }
  if (Number.isNaN(date.getTime())) return { absolute: STRINGS.shared.noDate, relative: "" };
  const dateOptions = dateOnly ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" };
  const absolute = new Intl.DateTimeFormat("en", dateOptions).format(date);
  const calendarDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((calendarDate - today) / 86_400_000);
  const relative = days === 0 ? STRINGS.shared.today
    : days === 1 ? STRINGS.shared.tomorrow
      : days === -1 ? STRINGS.shared.yesterday
        : new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day");
  return { absolute, relative };
}
