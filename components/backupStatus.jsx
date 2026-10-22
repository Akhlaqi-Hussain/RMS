"use client";
import { useEffect, useState } from "react";
import { FaDatabase, FaExclamationTriangle } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";

// BACKUP-2: shows the manager when the last backup was made, and warns when
// there has been none for more than a day.
export default function BackupStatus() {
  const { t, formatDateTime, formatNumber } = useLanguage();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/backups/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (alive) setStatus(data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!status) return null;

  const size = status.latest
    ? status.latest.bytes >= 1048576
      ? `${formatNumber((status.latest.bytes / 1048576).toFixed(1))} MB`
      : `${formatNumber(Math.max(1, Math.round(status.latest.bytes / 1024)))} KB`
    : "";

  return (
    <div
      className={`mb-6 rounded-xl border p-4 flex items-start gap-3 ${
        status.stale ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
      }`}
    >
      <div className={`mt-0.5 ${status.stale ? "text-amber-600" : "text-emerald-600"}`}>
        {status.stale ? <FaExclamationTriangle size={18} /> : <FaDatabase size={18} />}
      </div>
      <div className="min-w-0 text-sm">
        <p className={`font-semibold ${status.stale ? "text-amber-800" : "text-emerald-800"}`}>
          {status.latest
            ? t("backup.last", {
                date: formatDateTime(status.latest.createdAt),
                tier: t(`backup.tier.${status.latest.tier}`),
              })
            : t("backup.none")}
        </p>
        <p className="text-gray-600 mt-1">
          {status.stale
            ? t("backup.staleHint")
            : t("backup.summary", { count: formatNumber(status.count), size })}
          {!status.secondCopy && <> {t("backup.noSecondCopy")}</>}
        </p>
      </div>
    </div>
  );
}
