import jalaali from "jalaali-js";
import { getLangTag, normalizeLocale } from "./config";

// I18N-01: dates, times, numbers and money for each language.
// - English: Gregorian calendar, Latin digits, "AFN".
// - Dari / Pashto: Afghan solar calendar (Hamal … Hut / Wray … Kab),
//   Eastern Arabic digits (۱۲۳) and the ؋ sign.

const MONTHS = {
  fa: ["حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله", "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"],
  ps: ["وری", "غویی", "غبرګولی", "چنګاښ", "زمری", "وږی", "تله", "لړم", "لیندۍ", "مرغومی", "سلواغه", "کب"],
};

// Index = JavaScript getDay(): 0 = Sunday … 6 = Saturday
const WEEKDAYS = {
  fa: ["یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"],
  ps: ["اتوار", "ګل", "نهه", "شورو", "زیارت", "جمعه", "خالي"],
};

const isRtlLocale = (locale) => locale === "fa" || locale === "ps";
const numberingSystem = (locale) => (isRtlLocale(locale) ? "arabext" : "latn");

// Accepts Date objects, ISO strings and the database format "YYYY-MM-DD HH:mm"
// (database times are already Kabul time, so they are read as local time).
export function toDate(value) {
  if (value instanceof Date) return value;
  if (value === null || value === undefined || value === "") return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

export function formatNumber(value, locale, options = {}) {
  const loc = normalizeLocale(locale);
  const n = Number(value);
  if (!isFinite(n)) return "-";
  return new Intl.NumberFormat(getLangTag(loc), {
    maximumFractionDigits: 2,
    numberingSystem: numberingSystem(loc),
    ...options,
  }).format(n);
}

export function formatMoney(value, locale) {
  const loc = normalizeLocale(locale);
  const amount = formatNumber(value || 0, loc);
  return isRtlLocale(loc) ? `${amount} ؋` : `${amount} AFN`;
}

export function formatDate(value, locale) {
  const loc = normalizeLocale(locale);
  const date = toDate(value);
  if (!date) return "-";

  if (!isRtlLocale(loc)) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  const { jy, jm, jd } = jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const day = formatNumber(jd, loc, { useGrouping: false });
  const year = formatNumber(jy, loc, { useGrouping: false });
  return `${WEEKDAYS[loc][date.getDay()]}، ${day} ${MONTHS[loc][jm - 1]} ${year}`;
}

export function formatTime(value, locale) {
  const loc = normalizeLocale(locale);
  const date = toDate(value);
  if (!date) return "-";
  if (loc === "en") {
    return new Intl.DateTimeFormat(getLangTag(loc), {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }
  // Dari: ق.ظ / ب.ظ   Pashto: غ.م / غ.و  (the browser has no Afghan AM/PM labels)
  const h = date.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(date.getMinutes()).padStart(2, "0");
  const time = `${h12}:${mm}`.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  return `${time} ${DAY_PERIODS[loc][h < 12 ? 0 : 1]}`;
}

const DAY_PERIODS = { fa: ["ق.ظ", "ب.ظ"], ps: ["غ.م", "غ.و"] };

export function formatDateTime(value, locale) {
  const date = toDate(value);
  if (!date) return "-";
  return `${formatDate(date, locale)} – ${formatTime(date, locale)}`;
}
