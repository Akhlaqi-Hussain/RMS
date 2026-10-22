"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  getDir,
  getLangTag,
  normalizeLocale,
} from "@/lib/i18n/config";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatTime,
} from "@/lib/i18n/format";
import { SERVER_MESSAGE_KEYS } from "@/lib/i18n/serverMessages";
import { translate } from "@/lib/i18n/translate";

// I18N-01: language provider for the whole app.
// t("menu.title")            → text in the current language (English as fallback)
// t("common.orderNo", { id }) → replaces {id} in the text
// tServer(message)           → translates a known server/database message

const LanguageContext = createContext(null);

export function LanguageProvider({ initialLocale, children }) {
  const [locale, setLocaleState] = useState(normalizeLocale(initialLocale));
  const router = useRouter();

  const setLocale = useCallback(
    (next) => {
      const loc = normalizeLocale(next);
      document.cookie = `${LOCALE_COOKIE}=${loc}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = getLangTag(loc);
      document.documentElement.dir = getDir(loc);
      setLocaleState(loc);
      router.refresh();
    },
    [router]
  );

  const value = useMemo(() => {
    const t = (key, vars) => translate(locale, key, vars);
    const tServer = (message, fallbackKey) => {
      const key = SERVER_MESSAGE_KEYS[String(message ?? "").trim()];
      if (key) return t(`server.${key}`);
      if (message) return String(message);
      return fallbackKey ? t(fallbackKey) : t("server.internalError");
    };
    return {
      locale,
      dir: getDir(locale),
      isRtl: getDir(locale) === "rtl",
      setLocale,
      t,
      tServer,
      formatDate: (v) => formatDate(v, locale),
      formatTime: (v) => formatTime(v, locale),
      formatDateTime: (v) => formatDateTime(v, locale),
      formatNumber: (v, o) => formatNumber(v, locale, o),
      formatMoney: (v) => formatMoney(v, locale),
    };
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
