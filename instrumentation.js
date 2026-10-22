// BACKUP-3: Next.js runs register() once when the server starts.
// It starts the automatic backup schedule (Manage → Backups) on the server only.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackupScheduler } = await import("./lib/backupScheduler");
    startBackupScheduler();
  }
}
