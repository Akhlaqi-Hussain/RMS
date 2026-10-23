"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaUserShield } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/languageSwitcher";

// R9-SETUP: first start — create the first manager account.
// Needs the one-time setup code from the RMS computer (file setup-code.txt in
// the licence folder; in an installed RMS the setup opens this page with it).

const FIELDS = [
  ["firstName", "text"],
  ["lastName", "text"],
  ["username", "text"],
  ["phone", "tel"],
  ["password", "password"],
  ["confirm", "password"],
];

export default function SetupPage() {
  const { t, tServer } = useLanguage();
  const [needed, setNeeded] = useState(null);
  const [form, setForm] = useState({ code: "", firstName: "", lastName: "", username: "", phone: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const code = new URLSearchParams(window.location.search).get("code") || "";
    fetch("/api/setup", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { needed: false }))
      .then((d) => {
        if (!alive) return;
        if (!d.needed) {
          window.location.assign(new URL("/login", window.location.origin));
          return;
        }
        setNeeded(true);
        if (code) setForm((f) => ({ ...f, code }));
      })
      .catch(() => alive && setNeeded(true));
    return () => {
      alive = false;
    };
  }, []);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error(t("validation.passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      const { confirm, ...body } = form;
      const r = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.success) {
        toast.error(tServer(data.error, "setup.failed"));
        return;
      }
      toast.success(t("setup.done"));
      window.location.assign(new URL("/login", window.location.origin));
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6" style={{ background: "linear-gradient(to bottom right, var(--color-surface), #f9f9f9)" }}>
      <div className="w-full max-w-md flex justify-end mb-3">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-8">
        <div className="text-center mb-6">
          <FaUserShield className="mx-auto mb-2" size={28} style={{ color: "var(--color-primary)" }} />
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{t("setup.title")}</h1>
          <p className="text-sm text-gray-600 mt-2">{t("setup.subtitle")}</p>
        </div>
        {needed === null ? (
          <p className="text-center text-gray-500">{t("licence.loading")}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-1">{t("setup.code")}</label>
              <input id="code" name="code" dir="ltr" value={form.code} onChange={change} required autoComplete="off"
                className="w-full p-3 border border-gray-300 rounded-xl font-mono tracking-wider text-center" placeholder="XXXXX-XXXXX" />
              <p className="text-xs text-gray-500 mt-1">{t("setup.codeHint")}</p>
            </div>
            {FIELDS.map(([name, type]) => (
              <div key={name}>
                <label htmlFor={name} className="block text-sm font-medium mb-1">{t(`setup.${name}`)}</label>
                <input id={name} name={name} type={type} value={form[name]} onChange={change} required
                  autoComplete={type === "password" ? "new-password" : "off"}
                  dir={["username", "phone", "password", "confirm"].includes(name) ? "ltr" : undefined}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent" />
              </div>
            ))}
            <p className="text-xs text-gray-500">{t("setup.rules")}</p>
            <button type="submit" disabled={busy}
              className="w-full py-3 rounded-xl font-medium shadow-md disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }}>
              {busy ? t("setup.saving") : t("setup.submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
