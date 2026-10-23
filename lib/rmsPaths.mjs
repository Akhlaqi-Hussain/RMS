// R8-DATA: the one place that decides where RMS keeps its files.
// Used by the app (API routes, Manage → Backups) and by the scripts
// (backup, restore, create-manager, setup-production-db).
//
// RMS_DATA_DIR NOT set (development, tests, today's PC setup) → exactly as before:
//   settings  <project>/.env.local
//   pictures  <project>/public/uploads/menu
//   backups   BACKUP_DIR, otherwise <project>/../rms-backups
//   logs      <project>/../rms-logs
//
// RMS_DATA_DIR set (installed RMS, e.g. C:\ProgramData\RMS) → everything in one folder:
//   settings  <data>/config/rms.env
//   pictures  <data>/uploads/menu
//   backups   BACKUP_DIR (relative paths start at <data>), otherwise <data>/backups
//   logs      <data>/logs
// The program folder (e.g. C:\Program Files\RMS) is then never written to, and
// an upgrade or uninstall of the program never touches the data.
//
// `root` is the project/program folder: process.cwd() in the app, the folder
// above scripts/ in the scripts.
// /*turbopackIgnore: true*/ marks paths that are only known while RMS runs.
import { join, resolve } from "node:path";

export function dataDir(env = process.env) {
  const d = env.RMS_DATA_DIR;
  return d && d.trim() ? resolve(/*turbopackIgnore: true*/ d.trim()) : null;
}

export function configFile(root, env = process.env) {
  const d = dataDir(env);
  return d ? join(/*turbopackIgnore: true*/ d, "config", "rms.env") : join(/*turbopackIgnore: true*/ root, ".env.local");
}

export function picturesDir(root, env = process.env) {
  const d = dataDir(env);
  return d
    ? join(/*turbopackIgnore: true*/ d, "uploads", "menu")
    : join(/*turbopackIgnore: true*/ root, "public", "uploads", "menu");
}

// backupSetting: the BACKUP_DIR value from the settings (may be empty)
export function backupDir(root, backupSetting, env = process.env) {
  const d = dataDir(env);
  if (backupSetting) return resolve(/*turbopackIgnore: true*/ d || root, backupSetting);
  return d ? join(/*turbopackIgnore: true*/ d, "backups") : resolve(/*turbopackIgnore: true*/ root, "..", "rms-backups");
}

// copySetting: the BACKUP_COPY_DIR value (may be empty → no second copy)
export function backupCopyDir(root, copySetting, env = process.env) {
  if (!copySetting) return null;
  return resolve(/*turbopackIgnore: true*/ dataDir(env) || root, copySetting);
}

export function logDir(root, env = process.env) {
  const d = dataDir(env);
  return d ? join(/*turbopackIgnore: true*/ d, "logs") : resolve(/*turbopackIgnore: true*/ root, "..", "rms-logs");
}
