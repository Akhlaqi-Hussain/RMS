#!/usr/bin/env node
// =====================================================================
// RMS backup — creates one complete, verified backup file.
//
//   npm run backup                 manual backup now
//   npm run backup -- --auto       scheduled backup (daily / weekly / monthly)
//   npm run backup:list            list existing backups
//   npm run backup:verify -- <file>   check that a backup file is complete
//
// Settings (optional, in .env.local):
//   BACKUP_DIR=../rms-backups          where backups are kept (outside the project)
//   BACKUP_COPY_DIR=E:\RMS-backups     second copy, e.g. a USB disk (recommended)
//   BACKUP_KEEP_DAILY=7  BACKUP_KEEP_WEEKLY=5  BACKUP_KEEP_MONTHLY=12
//   BACKUP_KEEP_MANUAL=10  BACKUP_KEEP_PRE_RESTORE=5
//   BACKUP_MODE=docker                 docker (default) or direct (server without Docker)
// =====================================================================
import {
  createBackup, fmtBytes, listBackups, loadConfig, log, verifyArchive,
} from "./backup-lib.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const value = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

async function main() {
  const cfg = loadConfig({ db: value("--db") });

  if (flag("--list")) {
    const all = listBackups(cfg.dir, cfg.db);
    console.log(`Backups of "${cfg.db}" in ${cfg.dir}\n`);
    if (!all.length) console.log("  (none yet — run: npm run backup)");
    for (const b of all) {
      console.log(`  ${b.date} ${b.time.slice(0, 2)}:${b.time.slice(2, 4)}  ${b.tier.padEnd(11)} ${fmtBytes(b.bytes).padStart(9)}  ${b.name}`);
    }
    if (cfg.copyDir) console.log(`\nSecond copy folder: ${cfg.copyDir} (${listBackups(cfg.copyDir, cfg.db).length} backups)`);
    return;
  }

  if (flag("--verify")) {
    const file = value("--verify");
    if (!file) throw new Error("Usage: npm run backup:verify -- <backup file>");
    const m = await verifyArchive(file);
    const rows = Object.values(m.tables).reduce((a, b) => a + b, 0);
    console.log(`OK  ${m.name}\n    database ${m.database}, ${Object.keys(m.tables).length} tables, ${rows} rows, ${m.routines} procedures, ${m.pictures} pictures, created ${m.created_local}`);
    return;
  }

  const tier = flag("--auto") ? "auto" : "manual";
  log(cfg, `Backup of "${cfg.db}" started (${tier === "auto" ? "scheduled" : "manual"}, mode ${cfg.mode})…`);
  const r = await createBackup(cfg, tier);
  const rows = Object.values(r.manifest.tables).reduce((a, b) => a + b, 0);
  log(cfg, `OK  ${r.name}  (${fmtBytes(r.bytes)}; ${Object.keys(r.manifest.tables).length} tables, ${rows} rows, ${r.manifest.routines} procedures, ${r.manifest.pictures} pictures) — checked`);
  log(cfg, `    saved in ${cfg.dir}${r.copied ? ` and copied to ${r.copied}` : ""}`);
  if (!cfg.copyDir) console.log("    Tip: set BACKUP_COPY_DIR in .env.local to keep a second copy on another disk or USB.");
  if (r.removed.length) log(cfg, `    old backups removed (retention): ${r.removed.join(", ")}`);
}

main().catch((e) => {
  try { log(loadConfig(), `FAILED: ${e.message}`); } catch { console.error(`FAILED: ${e.message}`); }
  if (/docker/i.test(e.message)) console.error("Is Docker Desktop running and the database started? (docker compose --env-file .env.local up -d)");
  process.exit(1);
});
