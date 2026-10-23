"use client";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaCopy, FaKey, FaWhatsapp, FaEnvelope, FaUser } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/languageSwitcher";

// R9-LIC: licence page — status, machine code to send to the owner, the
// owner's contact details, and the box for the activation code.
// Reachable without login (first start, expired licence).

const STATE_STYLE = {
  valid: "bg-emerald-50 border-emerald-200 text-emerald-800",
  expiring: "bg-amber-50 border-amber-200 text-amber-800",
  expired: "bg-red-50 border-red-200 text-red-800",
  clock: "bg-red-50 border-red-200 text-red-800",
  missing: "bg-gray-50 border-gray-200 text-gray-800",
  invalid: "bg-red-50 border-red-200 text-red-800",
};

export default function LicencePage() {
  const { t, tServer, formatDate, formatNumber } = useLanguage();
  const [status, setStatus] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const machineRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/licence", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setStatus(d); })
      .catch(() => {}); // shown as "loading" until the page is opened again
    return () => {
      alive = false;
    };
  }, []);

  const copyMachineCode = async () => {
    const text = status?.machineCode || "";
    try {
      // navigator.clipboard needs https or localhost; otherwise select + copy
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        machineRef.current?.select();
        document.execCommand("copy");
      }
      toast.success(t("licence.copied"));
    } catch {
      machineRef.current?.select();
      toast(t("licence.copyManually"));
    }
  };

  const activate = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/licence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.success) {
        toast.error(tServer(data.error, "licence.activateFailed"));
        return;
      }
      setStatus(data);
      setCode("");
      toast.success(t("licence.activated", { date: formatDate(data.expires) }));
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  };

  const s = status;
  const stateText = !s
    ? t("licence.loading")
    : s.state === "valid"
      ? t("licence.stateValid", { date: formatDate(s.expires) })
      : s.state === "expiring"
        ? t("licence.stateExpiring", { date: formatDate(s.expires), days: formatNumber(s.daysLeft) })
        : s.state === "expired"
          ? t("licence.stateExpired", { date: formatDate(s.expires) })
          : s.state === "clock"
            ? t("licence.stateClock")
            : s.state === "invalid"
              ? t("licence.stateInvalid")
              : t("licence.stateMissing");
  const canContinue = s && !s.blocked;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6" style={{ background: "linear-gradient(to bottom right, var(--color-surface), #f9f9f9)" }}>
      <div className="w-full max-w-xl flex justify-end mb-3">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-5 sm:p-8 space-y-6">
        <div className="text-center">
          <FaKey className="mx-auto mb-2" size={28} style={{ color: "var(--color-primary)" }} />
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{t("licence.title")}</h1>
          {s && !s.enforced && <p className="text-xs text-gray-500 mt-2">{t("licence.notEnforced")}</p>}
        </div>

        <div className={`rounded-xl border p-4 text-sm font-medium ${STATE_STYLE[s?.state] || STATE_STYLE.missing}`}>
          {stateText}
          {s?.licenceNo ? <span className="block mt-1 text-xs font-normal opacity-80">{t("licence.number", { no: s.licenceNo })}</span> : null}
          {s?.readOnly && <span className="block mt-1 font-normal">{t("licence.readOnlyHint")}</span>}
        </div>

        <div>
          <p className="text-sm text-gray-700 mb-2">{t("licence.step1")}</p>
          <div className="flex gap-2">
            <input
              ref={machineRef}
              readOnly
              dir="ltr"
              value={s?.machineCode || ""}
              className="flex-1 min-w-0 p-3 border border-gray-300 rounded-xl font-mono text-base sm:text-lg tracking-wider text-center bg-gray-50"
              aria-label={t("licence.machineCode")}
            />
            <button type="button" onClick={copyMachineCode} className="px-4 rounded-xl border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm" title={t("licence.copy")}>
              <FaCopy /> <span className="hidden sm:inline">{t("licence.copy")}</span>
            </button>
          </div>
        </div>

        {s?.contact && (
          <div className="rounded-xl border border-gray-200 p-4 text-sm space-y-2">
            <p className="font-semibold text-gray-800">{t("licence.contactTitle")}</p>
            <p className="flex items-center gap-2"><FaUser className="text-gray-500" /> {s.contact.name}</p>
            <p className="flex items-center gap-2"><FaWhatsapp className="text-emerald-600" /> <span dir="ltr">{s.contact.whatsapp}</span></p>
            <p className="flex items-center gap-2 break-all"><FaEnvelope className="text-gray-500" /> <a className="underline" dir="ltr" href={`mailto:${s.contact.email}`}>{s.contact.email}</a></p>
          </div>
        )}

        <form onSubmit={activate} className="space-y-3">
          <label htmlFor="code" className="block text-sm text-gray-700">{t("licence.step2")}</label>
          <textarea
            id="code"
            dir="ltr"
            rows={4}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="RMS1-…"
            className="w-full p-3 border border-gray-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="w-full py-3 rounded-xl font-medium shadow-md disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
          >
            {busy ? t("licence.activating") : t("licence.activate")}
          </button>
        </form>

        {canContinue && (
          <a href="/login" className="block text-center text-sm underline" style={{ color: "var(--color-primary)" }}>
            {t("licence.continue")}
          </a>
        )}
      </div>
    </div>
  );
}
