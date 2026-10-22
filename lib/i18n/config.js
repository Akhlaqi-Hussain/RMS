// I18N-01: supported languages.
// English is the default. Dari (fa-AF) and Pashto (ps-AF) are written right-to-left.
// The chosen language is remembered in the "lang" cookie (no change to page addresses).

export const LOCALES = ["en", "fa", "ps"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "lang";

export const LOCALE_INFO = {
  en: { label: "English", tag: "en-US", dir: "ltr" },
  fa: { label: "دری", tag: "fa-AF", dir: "rtl" },
  ps: { label: "پښتو", tag: "ps-AF", dir: "rtl" },
};

export function normalizeLocale(value) {
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function getDir(locale) {
  return LOCALE_INFO[normalizeLocale(locale)].dir;
}

export function getLangTag(locale) {
  return LOCALE_INFO[normalizeLocale(locale)].tag;
}
