import { formatDate, formatTime as formatTimeI18n } from "@/lib/i18n/format";

// I18N-01: kept for compatibility. Dates are now formatted per language in
// lib/i18n/format.js (Afghan solar calendar for Dari/Pashto, Gregorian for English).
// Without a language these keep the old behaviour: Dari, Afghan solar calendar.

export function formatJalaliDate(dateString, locale = "fa") {
  return formatDate(dateString, locale);
}

export function formatTime(dateString, locale = "fa") {
  return formatTimeI18n(dateString, locale);
}
