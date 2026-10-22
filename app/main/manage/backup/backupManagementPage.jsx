"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FaDatabase, FaDownload, FaExclamationTriangle, FaClock, FaInfoCircle, FaSpinner,
} from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";

// BACKUP-3: Manage → Backups (manager only).
// - "Back up now" button
// - automatic schedule: on/off, every day / twice a day / once a week, time
// - list of backups with download
// Restoring is deliberately NOT a button: it replaces all data, so it is done
// by the administrator with `npm run restore` (which first makes a safety copy).
export default function BackupManagementPage() {
  const { t, formatDateTime, formatNumber } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  // fetch first, then update the screen (no state change directly inside the effect)
  const load = useCallback(
    () =>
      fetch("/api/backups", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((json) => {
          setData(json);
          setForm((f) => f || json.settings);
        })
        .catch(() => toast.error(t("backup.loadFailed")))
        .finally(() => setLoading(false)),
    [t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const size = (bytes) =>
    bytes >= 1048576
      ? `${formatNumber((bytes / 1048576).toFixed(1))} MB`
      : `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} KB`;

  const backupNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      if (res.status === 409) toast.error(t("backup.busy"));
      else if (!res.ok) toast.error(t("backup.failed"));
      else toast.success(t("backup.done"));
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setRunning(false);
      load();
    }
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/backups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(t("backup.scheduleSaved"));
      load();
    } catch {
      toast.error(t("backup.scheduleFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data || !form) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[color:var(--color-primary)]"></div>
      </div>
    );
  }

  const busy = running || !!data.running;

  return (
    <div className="space-y-8">
      {/* Header + Back up now */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl font-bold">{t("backup.title")}</h2>
        <button
          onClick={backupNow}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[color:var(--color-primary)] text-white font-semibold hover:bg-[color:var(--color-primary-light)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? <FaSpinner className="animate-spin" /> : <FaDatabase />}
          {busy ? t("backup.running") : t("backup.now")}
        </button>
      </div>

      {/* Status */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${data.stale ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
        <div className={`mt-0.5 ${data.stale ? "text-amber-600" : "text-emerald-600"}`}>
          {data.stale ? <FaExclamationTriangle size={18} /> : <FaDatabase size={18} />}
        </div>
        <div className="text-sm min-w-0">
          <p className={`font-semibold ${data.stale ? "text-amber-800" : "text-emerald-800"}`}>
            {data.latest
              ? t("backup.last", { date: formatDateTime(data.latest.createdAt), tier: t(`backup.tier.${data.latest.tier}`) })
              : t("backup.none")}
          </p>
          <p className="text-gray-600 mt-1">
            {data.nextRun
              ? t("backup.nextRun", { date: formatDateTime(data.nextRun) })
              : t("backup.autoOff")}
          </p>
          {data.lastResult && !data.lastResult.ok && (
            <p className="text-red-700 mt-1">{t("backup.lastFailed", { date: formatDateTime(data.lastResult.at) })}</p>
          )}
        </div>
      </div>

      {/* Schedule */}
      <form onSubmit={saveSchedule} className="rounded-xl border border-gray-200 p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <FaClock /> {t("backup.scheduleTitle")}
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-5 h-5 accent-[color:var(--color-primary)]"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span>{t("backup.enabled")}</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <label className="block">
            <span className="block text-sm text-gray-600 mb-1">{t("backup.frequency")}</span>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white disabled:bg-gray-100"
              value={form.frequency}
              disabled={!form.enabled}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              <option value="daily">{t("backup.freq.daily")}</option>
              <option value="twice-daily">{t("backup.freq.twice-daily")}</option>
              <option value="weekly">{t("backup.freq.weekly")}</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm text-gray-600 mb-1">{t("backup.time")}</span>
            <input
              type="time"
              dir="ltr"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white disabled:bg-gray-100"
              value={form.time}
              disabled={!form.enabled}
              required
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </label>
          {form.frequency === "weekly" && (
            <label className="block">
              <span className="block text-sm text-gray-600 mb-1">{t("backup.weekday")}</span>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white disabled:bg-gray-100"
                value={form.weekday}
                disabled={!form.enabled}
                onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}
              >
                {[6, 0, 1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>{t(`weekdays.${d}`)}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <p className="text-sm text-gray-500 flex gap-2">
          <FaInfoCircle className="mt-0.5 shrink-0" />
          <span>
            {t("backup.scheduleHint")}{" "}
            {t("backup.keepHint", {
              daily: formatNumber(data.keep.daily),
              weekly: formatNumber(data.keep.weekly),
              monthly: formatNumber(data.keep.monthly),
              manual: formatNumber(data.keep.manual),
            })}
          </span>
        </p>
        {!data.schedulerOn && <p className="text-sm text-amber-700">{t("backup.schedulerOff")}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[color:var(--color-primary)] text-white font-semibold hover:bg-[color:var(--color-primary-light)] disabled:opacity-60"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-800">
          {t("backup.listTitle", { count: formatNumber(data.backups.length) })}
        </div>
        {data.backups.length === 0 ? (
          <p className="p-6 text-center text-gray-500">{t("backup.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-600">
                <tr>
                  <th className="px-2 sm:px-6 py-3 text-start whitespace-nowrap">{t("backup.colDate")}</th>
                  <th className="px-2 sm:px-6 py-3 text-start whitespace-nowrap">{t("backup.colKind")}</th>
                  <th className="px-2 sm:px-6 py-3 text-start whitespace-nowrap">{t("backup.colSize")}</th>
                  <th className="px-2 sm:px-6 py-3 text-start whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.backups.map((b) => (
                  <tr key={b.name} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-6 py-3 min-w-[7.5rem]">{formatDateTime(b.createdAt)}</td>
                    <td className="px-2 sm:px-6 py-3">{t(`backup.tier.${b.tier}`)}</td>
                    <td className="px-2 sm:px-6 py-3 whitespace-nowrap"><span dir="ltr">{size(b.bytes)}</span></td>
                    <td className="px-2 sm:px-6 py-3 text-end">
                      <a
                        href={`/api/backups/download?name=${encodeURIComponent(b.name)}`}
                        aria-label={t("backup.download")}
                        className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                        title={b.name}
                      >
                        <FaDownload size={12} /> <span className="hidden sm:inline">{t("backup.download")}</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Second copy + restore info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-800 mb-1">{t("backup.copyTitle")}</p>
          <p className="text-gray-600">{data.secondCopy ? t("backup.copyOn") : t("backup.copyOff")}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-800 mb-1">{t("backup.restoreTitle")}</p>
          <p className="text-gray-600">{t("backup.restoreHint")}</p>
          <code dir="ltr" className="block mt-2 px-2 py-1 bg-gray-100 rounded text-xs text-gray-800 text-left">npm run restore -- --latest</code>
        </div>
      </div>
    </div>
  );
}
