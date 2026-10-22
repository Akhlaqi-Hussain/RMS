import { isDue, listBackups, readSettings, startBackup } from "./backupManager";

// BACKUP-3: checks once a minute whether a scheduled backup is due
// (settings in Manage → Backups). Started once by instrumentation.js.
// Set BACKUP_SCHEDULER=off in .env.local to switch it off completely
// (for example when only the Windows scheduled task should make backups).
const CHECK_EVERY_MS = 60 * 1000;
const FIRST_CHECK_MS = 90 * 1000; // give the database time to start after a reboot
const RETRY_AFTER_FAIL_MS = 10 * 60 * 1000;

export function startBackupScheduler() {
  if (process.env.BACKUP_SCHEDULER === "off") return;
  if (globalThis.__rmsBackupScheduler) return; // only one, also during development reloads
  let lastFailAt = 0;
  const tick = async () => {
    try {
      const settings = readSettings();
      if (!isDue(settings, listBackups())) return;
      if (Date.now() - lastFailAt < RETRY_AFTER_FAIL_MS) return;
      const run = startBackup({ auto: true });
      if (!run.started) return;
      const result = await run.finished;
      if (result.ok) console.log(`[backup] scheduled backup done: ${result.name}`);
      else {
        lastFailAt = Date.now();
        console.error(`[backup] scheduled backup FAILED: ${result.message} (next try in 10 minutes)`);
      }
    } catch (e) {
      lastFailAt = Date.now();
      console.error("[backup] scheduler error:", e.message);
    }
  };
  const first = setTimeout(() => {
    tick();
    const every = setInterval(tick, CHECK_EVERY_MS);
    every.unref?.();
  }, FIRST_CHECK_MS);
  first.unref?.();
  globalThis.__rmsBackupScheduler = true;
}
