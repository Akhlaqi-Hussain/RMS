// =====================================================================
// RMS backup toolkit: shared helpers for scripts/backup.mjs and
// scripts/restore.mjs. Node.js only, no extra packages.
//
// A backup is ONE file:  rms-backup_<db>_<YYYY-MM-DD_HHmmss>_<tier>.tar.gz
//   database.sql.gz   full database dump (tables, data, stored procedures)
//   uploads/menu/...  the menu pictures
//   manifest.json     date, database, row count per table, SHA-256 of every file
//
// Tiers: daily / weekly / monthly (scheduled, "grandfather-father-son"),
//        manual (npm run backup) and pre-restore (taken automatically just
//        before a restore, so a restore can always be undone).
// =====================================================================
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync, createReadStream, createWriteStream, existsSync, mkdirSync,
  mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync,
  writeFileSync, appendFileSync,
} from "node:fs";
import { tmpdir, hostname } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip, createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
// R8-DATA: where settings, pictures and backups live (same rules as the app)
import { backupCopyDir, backupDir, configFile, dataDir, picturesDir } from "../lib/rmsPaths.mjs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FORMAT = "rms-backup/1";
export const NAME_RE = /^rms-backup_([A-Za-z0-9_]+?)_(\d{4}-\d{2}-\d{2})_(\d{6})_(daily|weekly|monthly|manual|pre-restore)\.tar\.gz$/;
const DB_NAME_RE = /^[A-Za-z0-9_]+$/;

// ---------- settings ----------
// R8-DATA: .env.local in the project, or <RMS_DATA_DIR>/config/rms.env when installed
export function readEnvFile(file = configFile(ROOT)) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let value = line.slice(i + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    env[line.slice(0, i).trim()] = value;
  }
  return env;
}

// R8-BKUSER: the database administrator (root) password is only needed for
// restore and database setup. In an installed RMS it is kept in a separate
// file that only Administrators can read: RMS_ADMIN_CONFIG, or
// <RMS_DATA_DIR>/config/admin.env. The running web app never needs it when
// BACKUP_DB_USER / BACKUP_DB_PASSWORD (a backup-only database user) are set.
export function adminConfigFile() {
  if (process.env.RMS_ADMIN_CONFIG) return resolve(process.env.RMS_ADMIN_CONFIG);
  const d = dataDir();
  return d ? join(d, "config", "admin.env") : null;
}

function readAdminEnv() {
  const f = adminConfigFile();
  try {
    return f ? readEnvFile(f) : {};
  } catch {
    return {}; // not readable for this Windows user (e.g. the web app) → no root password
  }
}

export function loadConfig(overrides = {}) {
  const env = readEnvFile();
  const admin = readAdminEnv();
  const num = (v, d) => (Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  const cfg = {
    root: ROOT,
    envFile: configFile(ROOT),
    // .env.local decides; the DB_NAME of the current window is deliberately ignored
    // (a forgotten `set DB_NAME=rms_test` must not change what gets backed up).
    db: overrides.db || env.DB_NAME || "rms_dev",
    mode: (process.env.RMS_BACKUP_MODE || env.BACKUP_MODE || "docker").toLowerCase(),
    host: env.DB_HOST || "127.0.0.1",
    port: env.DB_PORT || "3307",
    rootPassword: env.MYSQL_ROOT_PASSWORD || admin.MYSQL_ROOT_PASSWORD || "",
    // R8-BKUSER: backup-only database user (used in direct mode for backups)
    backupUser: env.BACKUP_DB_USER || "",
    backupPassword: env.BACKUP_DB_PASSWORD || "",
    dir: backupDir(ROOT, env.BACKUP_DIR),
    copyDir: backupCopyDir(ROOT, env.BACKUP_COPY_DIR),
    picturesDir: picturesDir(ROOT),
    keep: {
      daily: num(env.BACKUP_KEEP_DAILY, 7),
      weekly: num(env.BACKUP_KEEP_WEEKLY, 5),
      monthly: num(env.BACKUP_KEEP_MONTHLY, 12),
      manual: num(env.BACKUP_KEEP_MANUAL, 10),
      "pre-restore": num(env.BACKUP_KEEP_PRE_RESTORE, 5),
    },
  };
  if (!DB_NAME_RE.test(cfg.db)) throw new Error(`Invalid database name: ${cfg.db}`);
  if (!["docker", "direct"].includes(cfg.mode)) throw new Error(`BACKUP_MODE must be docker or direct, not ${cfg.mode}`);
  if (cfg.backupUser && !/^[A-Za-z0-9_]+$/.test(cfg.backupUser)) throw new Error(`Invalid BACKUP_DB_USER: ${cfg.backupUser}`);
  return cfg;
}

// ---------- running programs ----------
// asBackupUser: read-only work (dump, row counts). In direct mode it uses the
// backup-only user when BACKUP_DB_USER is set (R8-BKUSER); otherwise root, as before.
function sqlCommand(cfg, tool, args, { asBackupUser = false } = {}) {
  // docker: the tool runs INSIDE the database container; the root password is
  //         read there from the container's own settings, never shown on screen.
  // direct: the tool on this computer connects to DB_HOST:DB_PORT
  //         (for a server without Docker).
  if (cfg.mode === "docker") {
    const quoted = args.map((a) => `'${String(a).replace(/'/g, `'\\''`)}'`).join(" ");
    return {
      cmd: "docker",
      args: ["compose", "--env-file", cfg.envFile, "exec", "-T", "db", "sh", "-c", `MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec ${tool} -uroot ${quoted}`],
      env: process.env,
    };
  }
  if (asBackupUser && cfg.backupUser) {
    return {
      cmd: tool,
      args: ["-h", cfg.host, "-P", String(cfg.port), `-u${cfg.backupUser}`, ...args],
      env: { ...process.env, MYSQL_PWD: cfg.backupPassword },
    };
  }
  return {
    cmd: tool,
    args: ["-h", cfg.host, "-P", String(cfg.port), "-uroot", ...args],
    env: { ...process.env, MYSQL_PWD: cfg.rootPassword },
  };
}

// PROD-1: the same command builder for other admin scripts (setup-production-db).
export const sqlCommandFor = (cfg, tool, args) => sqlCommand(cfg, tool, args);

export function run(cmd, args, { cwd = ROOT, env = process.env, input, stdout } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd, env, stdio: ["pipe", stdout ? "pipe" : "pipe", "pipe"], windowsHide: true });
    let out = "", err = "";
    child.on("error", (e) => reject(new Error(`Could not start "${cmd}": ${e.message}`)));
    child.stderr.on("data", (d) => { err += d; });
    const done = new Promise((r) => child.on("close", r));
    const outDone = stdout
      ? pipeline(child.stdout, stdout)
      : new Promise((r) => { child.stdout.on("data", (d) => { out += d; }); child.stdout.on("end", r); });
    const inDone = input
      ? pipeline(input, child.stdin).catch((e) => { if (e.code !== "EPIPE") throw e; })
      : Promise.resolve(child.stdin.end());
    Promise.all([done, outDone, inDone]).then(([code]) => {
      const cleanErr = err.split(/\r?\n/).filter((l) => l && !/Using a password on the command line/i.test(l)).join("\n");
      if (code !== 0) reject(new Error(`${cmd} failed (exit ${code}): ${cleanErr || out}`.trim()));
      else resolvePromise({ out, err: cleanErr });
    }, reject);
  });
}

export async function sql(cfg, query, db, { asBackupUser = false } = {}) {
  const c = sqlCommand(cfg, "mysql", ["-N", "-B", "--default-character-set=utf8mb4", ...(db ? [db] : []), "-e", query], { asBackupUser });
  const { out } = await run(c.cmd, c.args, { env: c.env });
  return out.split(/\r?\n/).filter(Boolean).map((l) => l.split("\t"));
}

// R8-BKUSER: asBackupUser only when making a backup. Database setup and the
// restore check use root (the backup user may not have rights on that database yet).
export async function tableCounts(cfg, db, { asBackupUser = false } = {}) {
  const ro = { asBackupUser };
  const tables = (await sql(cfg, `SELECT table_name FROM information_schema.tables WHERE table_schema='${db}' AND table_type='BASE TABLE' ORDER BY table_name`, undefined, ro)).map((r) => r[0]);
  const counts = {};
  if (tables.length) {
    const q = tables.map((t) => `SELECT '${t}', COUNT(*) FROM \`${db}\`.\`${t}\``).join(" UNION ALL ");
    for (const [t, n] of await sql(cfg, q, undefined, ro)) counts[t] = Number(n);
  }
  const [[routines]] = await sql(cfg, `SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='${db}'`, undefined, ro);
  return { counts, routines: Number(routines) };
}

export async function dumpDatabase(cfg, db, outFile) {
  const c = sqlCommand(cfg, "mysqldump", [
    "--single-transaction", "--routines", "--triggers", "--events",
    "--default-character-set=utf8mb4", "--no-tablespaces", "--hex-blob",
    "--set-gtid-purged=OFF", db,
  ], { asBackupUser: true });
  const gz = createGzip({ level: 9 });
  const file = createWriteStream(outFile);
  const piping = pipeline(gz, file);
  await run(c.cmd, c.args, { env: c.env, stdout: gz });
  await piping;
  // a complete dump always ends with this line
  const tail = await readGzTail(outFile);
  if (!/-- Dump completed/.test(tail)) throw new Error("The database dump is incomplete (no 'Dump completed' line).");
}

export async function importDatabase(cfg, db, gzFile) {
  const c = sqlCommand(cfg, "mysql", ["--default-character-set=utf8mb4", db]);
  const input = createReadStream(gzFile).pipe(createGunzip());
  await run(c.cmd, c.args, { env: c.env, input });
}

async function readGzTail(file) {
  let tail = "";
  await pipeline(createReadStream(file), createGunzip(), async function* (src) {
    for await (const chunk of src) tail = (tail + chunk.toString("utf8")).slice(-4000);
  });
  return tail;
}

// ---------- files ----------
export function sha256(file) {
  return new Promise((ok, fail) => {
    const h = createHash("sha256");
    createReadStream(file).on("data", (d) => h.update(d)).on("end", () => ok(h.digest("hex"))).on("error", fail);
  });
}

export function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

export function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const f of listFiles(src)) {
    const target = join(dst, relative(src, f));
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(f, target);
    n++;
  }
  return n;
}

export const tempDir = (prefix) => mkdtempSync(join(tmpdir(), prefix));

// Windows: always use the tar.exe that ships with Windows (a "tar" from Git or
// MSYS earlier in PATH would misread drive letters such as G:).
const TAR =
  process.platform === "win32" && process.env.SystemRoot &&
  existsSync(join(process.env.SystemRoot, "System32", "tar.exe"))
    ? join(process.env.SystemRoot, "System32", "tar.exe")
    : "tar";

export async function makeArchive(srcDir, outFile) {
  const partial = outFile + ".partial";
  rmSync(partial, { force: true });
  // tar is built into Windows 10/11, macOS and Linux
  await run(TAR, ["-czf", partial, "-C", srcDir, "."]);
  renameSync(partial, outFile);
}

export async function extractArchive(file, destDir) {
  mkdirSync(destDir, { recursive: true });
  await run(TAR, ["-xzf", file, "-C", destDir]);
}

// ---------- naming, tiers and retention ----------
const pad = (n, w = 2) => String(n).padStart(w, "0");
export function stamp(d = new Date()) {
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}` };
}

export function parseName(name) {
  const m = NAME_RE.exec(name);
  if (!m) return null;
  const [, db, date, time, tier] = m;
  const when = new Date(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`);
  return { name, db, date, time, tier, when };
}

export function listBackups(dir, db) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map(parseName)
    .filter((b) => b && (!db || b.db === db))
    .map((b) => ({ ...b, path: join(dir, b.name), bytes: statSync(join(dir, b.name)).size }))
    .sort((a, b) => b.when - a.when);
}

// Afghanistan's week starts on Saturday.
function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 1) % 7));
  return x.getTime();
}

// Scheduled backups: the first one of a month is "monthly", the first one of a
// week is "weekly", all others are "daily".
export function autoTier(existing, now = new Date()) {
  const sched = existing.filter((b) => ["daily", "weekly", "monthly"].includes(b.tier));
  const sameMonth = (b) => b.when.getFullYear() === now.getFullYear() && b.when.getMonth() === now.getMonth();
  if (!sched.some((b) => b.tier === "monthly" && sameMonth(b))) return "monthly";
  if (!sched.some((b) => ["weekly", "monthly"].includes(b.tier) && weekStart(b.when) === weekStart(now))) return "weekly";
  return "daily";
}

// Keep the newest N of each tier; delete only files that match the backup name pattern.
export function prune(dir, db, keep) {
  const removed = [];
  const all = listBackups(dir, db);
  for (const tier of Object.keys(keep)) {
    const ofTier = all.filter((b) => b.tier === tier);
    for (const b of ofTier.slice(keep[tier])) {
      rmSync(b.path, { force: true });
      removed.push(b.name);
    }
  }
  return removed;
}

export function log(cfg, message) {
  const line = `${new Date().toISOString()}  ${message}`;
  console.log(message);
  try {
    mkdirSync(cfg.dir, { recursive: true });
    appendFileSync(join(cfg.dir, "backup.log"), line + "\n");
  } catch {
    // logging must never stop a backup
  }
}

export function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ---------- create one backup ----------
export async function createBackup(cfg, tier) {
  const db = cfg.db;
  mkdirSync(cfg.dir, { recursive: true });
  if (tier === "auto") tier = autoTier(listBackups(cfg.dir, db));
  const { date, time } = stamp();
  const name = `rms-backup_${db}_${date}_${time}_${tier}.tar.gz`;
  const work = tempDir("rms-backup-");
  try {
    // 1. database
    const before = await tableCounts(cfg, db, { asBackupUser: true });
    if (!Object.keys(before.counts).length) throw new Error(`Database "${db}" has no tables (wrong name or not running?).`);
    await dumpDatabase(cfg, db, join(work, "database.sql.gz"));
    // 2. pictures
    const pictures = copyDir(cfg.picturesDir, join(work, "uploads", "menu"));
    // 3. manifest with a checksum for every file
    const files = {};
    for (const f of listFiles(work)) {
      const rel = relative(work, f).split(sep).join("/");
      files[rel] = { sha256: await sha256(f), bytes: statSync(f).size };
    }
    let commit = null;
    try { commit = (await run("git", ["rev-parse", "--short", "HEAD"])).out.trim(); } catch { /* git is optional */ }
    const manifest = {
      format: FORMAT, app: "RMS", name, tier, database: db,
      created_at: new Date().toISOString(),
      created_local: `${date} ${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`,
      host: hostname(), git_commit: commit,
      tables: before.counts, routines: before.routines, pictures, files,
    };
    writeFileSync(join(work, "manifest.json"), JSON.stringify(manifest, null, 2));
    // 4. one archive, written under a temporary name and renamed when complete
    const out = join(cfg.dir, name);
    await makeArchive(work, out);
    // 5. read it back to be sure it is usable
    await verifyArchive(out);
    const bytes = statSync(out).size;
    // 6. optional second copy (USB / second disk / network share)
    let copied = null;
    if (cfg.copyDir) {
      try {
        mkdirSync(cfg.copyDir, { recursive: true });
        copyFileSync(out, join(cfg.copyDir, name + ".partial"));
        renameSync(join(cfg.copyDir, name + ".partial"), join(cfg.copyDir, name));
        copied = cfg.copyDir;
      } catch (e) {
        log(cfg, `WARNING second copy failed (${cfg.copyDir}): ${e.message}`);
      }
    }
    // 7. retention
    const removed = prune(cfg.dir, db, cfg.keep);
    if (copied) removed.push(...prune(cfg.copyDir, db, cfg.keep).map((n) => `${n} (copy)`));
    return { name, path: out, bytes, tier, manifest, copied, removed };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// ---------- verify / open a backup ----------
export async function openArchive(file) {
  const work = tempDir("rms-restore-");
  try {
    await extractArchive(file, work);
  } catch {
    rmSync(work, { recursive: true, force: true });
    throw new Error("This file is damaged or is not an RMS backup (it could not be unpacked).");
  }
  const mf = join(work, "manifest.json");
  if (!existsSync(mf)) throw new Error("This file is not an RMS backup (manifest.json missing).");
  const manifest = JSON.parse(readFileSync(mf, "utf8"));
  if (manifest.format !== FORMAT) throw new Error(`Unknown backup format: ${manifest.format}`);
  const problems = [];
  for (const [rel, info] of Object.entries(manifest.files || {})) {
    const p = join(work, ...rel.split("/"));
    if (!existsSync(p)) { problems.push(`missing: ${rel}`); continue; }
    if ((await sha256(p)) !== info.sha256) problems.push(`damaged: ${rel}`);
  }
  if (!manifest.files?.["database.sql.gz"]) problems.push("missing: database.sql.gz");
  if (problems.length) {
    rmSync(work, { recursive: true, force: true });
    throw new Error(`Backup check failed — ${problems.slice(0, 5).join(", ")}`);
  }
  const tail = await readGzTail(join(work, "database.sql.gz"));
  if (!/-- Dump completed/.test(tail)) {
    rmSync(work, { recursive: true, force: true });
    throw new Error("Backup check failed — the database dump is incomplete.");
  }
  return { work, manifest };
}

export async function verifyArchive(file) {
  const { work, manifest } = await openArchive(file);
  rmSync(work, { recursive: true, force: true });
  return manifest;
}

export { basename, existsSync, join, rmSync };
