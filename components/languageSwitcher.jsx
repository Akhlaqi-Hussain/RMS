"use client";
import { FaGlobe } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import { LOCALES, LOCALE_INFO } from "@/lib/i18n/config";

// I18N-01: language menu (English / دری / پښتو). Used on the login page and in the header.
export default function LanguageSwitcher({ className = "" }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className={`inline-flex items-center gap-1.5 text-gray-700 ${className}`}>
      <FaGlobe className="w-4 h-4 shrink-0 text-gray-500" aria-hidden="true" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg text-sm py-1.5 ps-2 pe-7 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
        aria-label={t("common.language")}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={LOCALE_INFO[code].tag}>
            {LOCALE_INFO[code].label}
          </option>
        ))}
      </select>
    </label>
  );
}
