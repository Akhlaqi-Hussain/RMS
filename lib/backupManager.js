import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
// R8-DATA: backup folder rules shared with scripts/backup-lib.mjs
import { backupDir as resolveBackupDir } from "./rmsPaths.mjs";

// BACKUP-3: server side of Manage → Backups and of the automatic schedule.
// The real work is always done by scripts/backup.mjs (the same program as
// `npm run backup`), started as a separate Node.js process. This file only:
//   - reads/saves the schedule settings (backup-settings.json in the backup folder),
//   - lists the backup files,
//   - starts a backup (never two at the same time),
//   - decides when the next scheduled backup is due.
// /*turbopackIgnore: true*/ marks paths that are only known while the app runs.

export const NAME_RE = /^rms-backup_([A-Za-z0-9_]+?)_(\d{4}-\d{2}-\d{2})_(\d{6})_(daily|weekly|monthly|manual|pre-restore)\.tar\.gz$/;
const SCHEDULED = ["daily", "weekly", "monthly"];
export const FREQUENCIES = ["daily", "twice-daily", "weekly"];
const DEFAULT_SETTINGS = { enabled: true, frequency: "daily", time: "23:30", weekday: 5 }; // 5 = Friday

const root = () => resolve(/*turbopackIgnore: true*/ process.cwd());
export const backupDir = () => resolveBackupDir(root(), process.env.BACKUP_DIR);
export const currentDb = () => process.env.DB_NAME || "rms_dev";
const settingsFile = () => join(/*turbopackIgnore: true*/ backupDir(), "backup-settings.json");

// ---------- settings ----------
export function readSettings() {
  try {
    const raw = JSON.parse(readFileSync(/*turbopackIgnore: true*/ settingsFile(), "utf8"));
    return validateSettings({ ...DEFAULT_SETTINGS, ...raw }).settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function validateSettings(input) {
  const s = {
    enabled: input?.enabled === true,
    frequency: String(input?.frequency ?? ""),
    time: String(input?.time ?? ""),
    weekday: Number(input?.weekday),
  };
  if (!FREQUENCIES.includes(s.frequency)) return { error: "Invalid backup frequency" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) return { error: "Invalid backup time" };
  if (!Number.isInteger(s.weekday) || s.weekday < 0 || s.weekday > 6) return { error: "Invalid backup weekday" };
  return { settings: s };
}

export function saveSettings(settings) {
  const dir = backupDir();
  mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  const tmp = settingsFile() + ".tmp";
  writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(settings, null, 2));
  renameSync(/*turbopackIgnore: true*/ tmp, settingsFile());
}

// ---------- backup files ----------
export function listBackups(db = currentDb()) {
  const dir = backupDir();
  if (!existsSync(/*turbopackIgnore: true*/ dir)) return [];
  return readdirSync(/*turbopackIgnore: true*/ dir)
    .map((name) => {
      const m = NAME_RE.exec(name);
      if (!m || m[1] !== db) return null;
      const [, , date, time, tier] = m;
      const when = new Date(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`);
      return { name, tier, when, bytes: statSync(join(/*turbopackIgnore: true*/ dir, name)).size };
    })
    .filter(Boolean)
    .sort((a, b) => b.when - a.when);
}

// Safe path of one backup file, or null (only exact backup names, only in the backup folder)
export function backupFilePath(name) {
  if (typeof name !== "string" || !NAME_RE.test(name)) return null;
  const p = join(/*turbopackIgnore: true*/ backupDir(), name);
  return existsSync(/*turbopackIgnore: true*/ p) ? p : null;
}

// ---------- schedule ----------
function at(day, time) {
  const [h, m] = time.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}

// The most recent planned run at or before `now`, and the next one after it.
export function scheduleSlots(settings, now = new Date()) {
  const candidates = [];
  for (let d = -8; d <= 8; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    if (settings.frequency === "weekly" && day.getDay() !== settings.weekday) continue;
    const first = at(day, settings.time);
    candidates.push(first);
    if (settings.frequency === "twice-daily") candidates.push(new Date(first.getTime() + 12 * 3600000));
  }
  candidates.sort((a, b) => a - b);
  const last = [...candidates].reverse().find((c) => c <= now) || null;
  const next = candidates.find((c) => c > now) || null;
  return { last, next };
}

// Due when the latest planned time has passed and no scheduled backup was made since then.
// (If the computer was off at that time, the backup runs soon after the app starts.)
export function isDue(settings, backups, now = new Date()) {
  if (!settings.enabled) return false;
  const { last } = scheduleSlots(settings, now);
  if (!last) return false;
  return !backups.some((b) => SCHEDULED.includes(b.tier) && b.when >= last);
}

// ---------- running a backup ----------
const state = (globalThis.__rmsBackupState ||= { running: null, lastResult: null });

export function backupState() {
  return { running: state.running, lastResult: state.lastResult };
}

export function startBackup({ auto = false } = {}) {
  if (state.running) return { started: false, reason: "busy" };
  const script = join(/*turbopackIgnore: true*/ root(), "scripts", "backup.mjs");
  const args = [script, "--db", currentDb()];
  if (auto) args.push("--auto");
  state.running = { auto, startedAt: new Date().toISOString() };
  let output = "";
  const finished = new Promise((done) => {
    let child;
    try {
      child = spawn(process.execPath, args, { cwd: root(), env: process.env, windowsHide: true });
    } catch (e) {
      state.running = null;
      state.lastResult = { ok: false, message: e.message, at: new Date().toISOString() };
      return done(state.lastResult);
    }
    child.stdout.on("data", (d) => { output += d; });
    child.stderr.on("data", (d) => { output += d; });
    child.on("error", (e) => { output += e.message; });
    child.on("close", (code) => {
      const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const ok = code === 0;
      const okLine = lines.find((l) => l.startsWith("OK ")) || "";
      const name = (okLine.match(/rms-backup_\S+\.tar\.gz/) || [])[0] || null;
      const failLine = lines.find((l) => l.startsWith("FAILED")) || lines[lines.length - 1] || "";
      state.lastResult = { ok, auto, name, message: ok ? okLine : failLine.replace(/^FAILED:\s*/, ""), at: new Date().toISOString() };
      state.running = null;
      done(state.lastResult);
    });
  });
  return { started: true, finished };
}
