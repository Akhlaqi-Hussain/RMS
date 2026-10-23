"use client";
import { useEffect, useState } from "react";
import { FaExclamationTriangle, FaTimes, FaWhatsapp, FaEnvelope } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import { getCurrentUser } from "@/lib/auth-client";

// R9-LIC: renewal reminder inside RMS (only in an installed RMS, where the
// licence check is on).
//  - last 30 days: a yellow bar for everyone; managers also get a pop-up once
//    a day with the end date, the owner's contact details and the machine code;
//  - expired or wrong computer date: a red bar on every page (read-only mode).
const REMINDER_KEY = "rms-licence-reminder"; // date of the last pop-up (this browser only)

export default function LicenceNotice() {
  const { t, formatDate, formatNumber } = useLanguage();
  const [lic, setLic] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/licence", { cache: "no-store" });
        if (!r.ok) return;
        const s = await r.json();
        if (!alive || !s.enforced) return;
        setLic(s);
        if (s.state !== "expiring") return;
        const user = await getCurrentUser();
        if (!alive || user?.role !== "manager") return;
        const today = new Date().toISOString().slice(0, 10);
        let last = null;
        try { last = localStorage.getItem(REMINDER_KEY); } catch { /* storage not available */ }
        if (last !== today) setShowPopup(true);
      } catch {
        // no notice when the status can't be read
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const closePopup = () => {
    try { localStorage.setItem(REMINDER_KEY, new Date().toISOString().slice(0, 10)); } catch { /* storage not available */ }
    setShowPopup(false);
  };

  if (!lic || !["expiring", "expired", "clock"].includes(lic.state)) return null;
  const red = lic.state !== "expiring";
  const barText =
    lic.state === "expiring"
      ? t("licence.barExpiring", { days: formatNumber(lic.daysLeft), date: formatDate(lic.expires) })
      : lic.state === "clock"
        ? t("licence.barClock")
        : t("licence.barExpired");

  return (
    <>
      <div className={`mb-4 rounded-xl border p-3 text-sm flex items-start gap-2 ${red ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
        <FaExclamationTriangle className="mt-0.5 shrink-0" />
        <span className="min-w-0">
          {barText}{" "}
          <a href="/licence" className="underline font-medium">{t("licence.openPage")}</a>
        </span>
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-amber-800">{t("licence.popupTitle")}</h2>
              <button type="button" onClick={closePopup} aria-label={t("licence.remindTomorrow")} className="text-gray-500 hover:text-gray-800">
                <FaTimes />
              </button>
            </div>
            <p>{t("licence.popupText", { date: formatDate(lic.expires), days: formatNumber(lic.daysLeft) })}</p>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-1">
              <p className="font-semibold">{lic.contact?.name}</p>
              <p className="flex items-center gap-2"><FaWhatsapp className="text-emerald-600 shrink-0" /> <span dir="ltr">{lic.contact?.whatsapp}</span></p>
              <p className="flex items-center gap-2 break-all"><FaEnvelope className="text-gray-500 shrink-0" /> <span dir="ltr">{lic.contact?.email}</span></p>
              <p>{t("licence.machineCode")}: <span dir="ltr" className="font-mono">{lic.machineCode}</span></p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a href="/licence" className="flex-1 text-center py-2 rounded-xl font-medium" style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }}>
                {t("licence.enterNewCode")}
              </a>
              <button type="button" onClick={closePopup} className="flex-1 py-2 rounded-xl border border-gray-300">
                {t("licence.remindTomorrow")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
