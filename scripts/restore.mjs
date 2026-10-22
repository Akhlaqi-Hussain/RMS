#!/usr/bin/env node
// =====================================================================
// RMS restore — puts the database and menu pictures back from a backup file.
//
//   npm run restore -- --latest            newest backup in BACKUP_DIR
//   npm run restore -- <backup file>       a specific file (e.g. from a USB disk)
//   add  --db <name>   to restore into another database (default: DB_NAME in .env.local)
//   add  --yes         to skip the typed confirmation (only for scripts)
//   add  --with-pictures  to replace the pictures folder even when restoring a
//                      database that is not the one RMS uses (see PROD-3 below)
//
// Safety:
//   1. the backup file is checked first (every file has a SHA-256 checksum);
//   2. a "pre-restore" backup of the CURRENT data is made before anything changes,
//      so the restore itself can be undone with:  npm run restore -- <that file>;
//   3. after the restore, the row count of every table is compared with the backup.
// Pictures (PROD-3): rms_dev, rms_test and rms_prod share one pictures folder.
//   - restoring the database RMS uses (DB_NAME in .env.local): the folder is
//     replaced by the backup's pictures, exactly as in the backup;
//   - restoring any other database (e.g. a practice restore into rms_test):
//     existing pictures are kept and only missing ones are added.
// Stop the app (Ctrl+C in the npm window) before restoring.
// =====================================================================
import { createInterface } from "node:readline/promises";
import {
  copyDir, createBackup, existsSync, fmtBytes, importDatabase, join, listBackups,
  loadConfig, log, openArchive, readEnvFile, rmSync, sql, tableCounts,
} from "./backup-lib.mjs";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const value = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

let replacing = false; // true once the current data starts being replaced

async function main() {
  const cfg = loadConfig({ db: value("--db") });
  let file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--db");
  if (flag("--latest")) {
    // newest backup OF THIS DATABASE (never another database's backup by accident)
    const own = listBackups(cfg.dir, cfg.db);
    const latest = own.find((b) => b.tier !== "pre-restore") || own[0];
    if (!latest) throw new Error(`No backups of "${cfg.db}" found in ${cfg.dir}`);
    file = latest.path;
  }
  if (!file) throw new Error("Usage: npm run restore -- --latest   or   npm run restore -- <backup file>");
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);

  // PROD-3: replace the shared pictures folder only for the database RMS uses
  const appDb = readEnvFile().DB_NAME || "rms_dev";
  const replacePictures = cfg.db === appDb || flag("--with-pictures");

  console.log(`Checking ${file} …`);
  const { work, manifest } = await openArchive(file);
  try {
    const rows = Object.values(manifest.tables).reduce((a, b) => a + b, 0);
    console.log(`\n  Backup made : ${manifest.created_local} (${manifest.tier})`);
    console.log(`  Contains    : database "${manifest.database}" — ${Object.keys(manifest.tables).length} tables, ${rows} rows, ${manifest.routines} procedures; ${manifest.pictures} pictures`);
    console.log(`  Restore into: database "${cfg.db}" (mode ${cfg.mode}) and ${cfg.picturesDir}`);
    if (manifest.database !== cfg.db) console.log(`  NOTE        : the backup came from "${manifest.database}", it will be restored into "${cfg.db}".`);
    if (replacePictures) {
      console.log(`\n  Everything currently in "${cfg.db}" and in the pictures folder will be REPLACED.`);
    } else {
      console.log(`\n  Everything currently in "${cfg.db}" will be REPLACED.`);
      console.log(`  Pictures: RMS uses "${appDb}", so existing pictures are KEPT; only missing ones are added.`);
    }
    console.log("  A safety backup of the current data is made first.\n");

    if (!flag("--yes")) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = (await rl.question(`  Type the database name (${cfg.db}) to continue, anything else to cancel: `)).trim();
      rl.close();
      if (answer !== cfg.db) { console.log("Cancelled — nothing was changed."); return; }
    }

    // 1. safety backup of the current state (skipped only if the database does not exist yet)
    const exists = (await sql(cfg, `SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='${cfg.db}'`))[0][0] === "1";
    if (exists) {
      log(cfg, `Restore: making a safety backup of the current "${cfg.db}" first…`);
      const safety = await createBackup(cfg, "pre-restore");
      log(cfg, `    safety backup: ${safety.name} (${fmtBytes(safety.bytes)}) — to undo this restore: npm run restore -- "${safety.path}"`);
    }

    // 2. database: recreate empty, then load the dump
    replacing = true;
    log(cfg, `Restore: replacing database "${cfg.db}" from ${manifest.name}…`);
    await sql(cfg, `DROP DATABASE IF EXISTS \`${cfg.db}\`; CREATE DATABASE \`${cfg.db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await importDatabase(cfg, cfg.db, join(work, "database.sql.gz"));

    // 3. compare every table's row count with the backup
    const after = await tableCounts(cfg, cfg.db);
    const diffs = Object.entries(manifest.tables).filter(([t, n]) => after.counts[t] !== n).map(([t, n]) => `${t}: ${after.counts[t]} instead of ${n}`);
    if (after.routines !== manifest.routines) diffs.push(`procedures: ${after.routines} instead of ${manifest.routines}`);
    if (diffs.length) throw new Error(`Restore check failed — ${diffs.join("; ")}`);

    // 4. pictures
    const src = join(work, "uploads", "menu");
    mkdirSync(cfg.picturesDir, { recursive: true });
    let pics = 0;
    let picNote;
    if (replacePictures) {
      // the database RMS uses: the folder becomes exactly the backup's pictures
      for (const f of readdirSync(cfg.picturesDir)) rmSync(join(cfg.picturesDir, f), { recursive: true, force: true });
      pics = existsSync(src) ? copyDir(src, cfg.picturesDir) : 0;
      picNote = `${pics} pictures`;
    } else {
      // another database: keep every existing picture, add only the missing ones
      if (existsSync(src)) {
        for (const e of readdirSync(src, { withFileTypes: true })) {
          const f = e.name;
          if (e.isFile() && !existsSync(join(cfg.picturesDir, f))) { copyFileSync(join(src, f), join(cfg.picturesDir, f)); pics++; }
        }
      }
      picNote = `pictures kept, ${pics} missing picture(s) added`;
    }

    log(cfg, `RESTORED  "${cfg.db}" from ${manifest.name}: all ${Object.keys(manifest.tables).length} tables match (${Object.values(after.counts).reduce((a, b) => a + b, 0)} rows), ${after.routines} procedures, ${picNote}.`);
    console.log("Start the app again (npm run dev / npm start). Everyone has to log in again only if JWT_SECRET changed.");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch((e) => {
  try { log(loadConfig(), `RESTORE FAILED: ${e.message}`); } catch { console.error(`RESTORE FAILED: ${e.message}`); }
  if (replacing) console.error("The current data was already being replaced: restore the safety backup shown above (pre-restore) to go back.");
  else console.error("Nothing was changed.");
  process.exit(1);
});
