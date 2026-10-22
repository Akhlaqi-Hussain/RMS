import { backupState, currentDb, listBackups, readSettings, scheduleSlots } from "./backupManager";

// BACKUP-2/3: summary for the dashboard card and Manage → Backups.
const STALE_HOURS = 26; // one nightly run plus some slack

export function getBackupStatus() {
  const backups = listBackups();
  const latest = backups[0] || null;
  const ageHours = latest ? (Date.now() - latest.when.getTime()) / 3600000 : null;
  const settings = readSettings();
  const { next } = scheduleSlots(settings);
  const keep = (name, d) => (Number.isInteger(Number(process.env[name])) ? Number(process.env[name]) : d);
  return {
    database: currentDb(),
    count: backups.length,
    latest: latest && { name: latest.name, tier: latest.tier, createdAt: latest.when.toISOString(), bytes: latest.bytes },
    stale: !latest || ageHours > STALE_HOURS,
    secondCopy: !!process.env.BACKUP_COPY_DIR,
    settings,
    nextRun: settings.enabled && next ? next.toISOString() : null,
    schedulerOn: process.env.BACKUP_SCHEDULER !== "off",
    keep: {
      daily: keep("BACKUP_KEEP_DAILY", 7),
      weekly: keep("BACKUP_KEEP_WEEKLY", 5),
      monthly: keep("BACKUP_KEEP_MONTHLY", 12),
      manual: keep("BACKUP_KEEP_MANUAL", 10),
    },
    ...backupState(),
  };
}
