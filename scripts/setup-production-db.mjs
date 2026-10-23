#!/usr/bin/env node
// =====================================================================
// RMS — create an EMPTY production database (PROD-1).
//
//   npm run db:setup-prod                   creates "rms_prod"
//   npm run db:setup-prod -- --db rms_shop  another name
//
// What it does:
//   1. refuses if the database already exists (it never changes or deletes
//      an existing database),
//   2. creates it (utf8mb4) and applies database/migrations/*.sql in order,
//      WITHOUT the synthetic seed data (no test staff, no test orders),
//   3. gives the application user (DB_USER, normally rms_app) the same
//      limited rights it has on rms_dev: SELECT, INSERT, UPDATE, DELETE, EXECUTE,
//   4. checks the result: all tables present and empty, all procedures present.
//
// Uses the same connection settings as the backups (.env.local):
//   BACKUP_MODE=docker (default) → runs inside the Docker database container
//   BACKUP_MODE=direct           → local mysql tool, DB_HOST/DB_PORT, MYSQL_ROOT_PASSWORD
// Next step afterwards: `npm run create-manager -- --db rms_prod`.
//
// R8-BKUSER — a backup-only database user, so backups never need the root password:
//   npm run db:setup-prod -- --db rms_prod --with-backup-user   new database + backup user
//   npm run db:setup-prod -- --db rms_prod --backup-user-only   ONLY the backup user's rights
//                                                               for an EXISTING database
//                                                               (no other change to it)
// The user (BACKUP_DB_USER, default rms_backup) may only READ that database:
// SELECT, SHOW VIEW, TRIGGER, EVENT on it, plus SHOW_ROUTINE to copy the stored
// procedures. It cannot change or delete anything and cannot read other databases.
// A new user gets a random password, shown ONCE, to put into the settings file.
// =====================================================================
import { createReadStream, readdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { Readable } from "node:stream";
import { ROOT, loadConfig, readEnvFile, run, sql, tableCounts, sqlCommandFor } from "./backup-lib.mjs";
import { configFile } from "../lib/rmsPaths.mjs";

const args = process.argv.slice(2);
const value = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

// R8-BKUSER: create (if missing) and give read-only rights on `db` to the backup user.
// Same host entries as the app user, so it connects the same way.
async function ensureBackupUser(cfg, db, appUser) {
  const backupUser = readEnvFile().BACKUP_DB_USER || "rms_backup";
  if (!/^[A-Za-z0-9_]+$/.test(backupUser)) throw new Error(`Invalid BACKUP_DB_USER: ${backupUser}`);
  let hosts = (await sql(cfg, `SELECT host FROM mysql.user WHERE user='${appUser}'`)).map((r) => r[0].replace(/'/g, ""));
  if (hosts.length === 0) hosts = ["localhost", "127.0.0.1"];
  const existing = new Set((await sql(cfg, `SELECT host FROM mysql.user WHERE user='${backupUser}'`)).map((r) => r[0]));
  const password = randomBytes(18).toString("hex");
  const created = [];
  for (const h of hosts) {
    const statements = [];
    if (!existing.has(h)) {
      statements.push(`CREATE USER '${backupUser}'@'${h}' IDENTIFIED BY '${password}';`);
      created.push(h);
    }
    statements.push(`GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON \`${db}\`.* TO '${backupUser}'@'${h}';`);
    statements.push(`GRANT SHOW_ROUTINE ON *.* TO '${backupUser}'@'${h}';`);
    // sent through standard input, so the password never appears in the list of running programs
    const c = sqlCommandFor(cfg, "mysql", ["--default-character-set=utf8mb4"]);
    await run(c.cmd, c.args, { env: c.env, input: Readable.from([statements.join("\n")]) });
    console.log(`  backup user ${backupUser}@${h}: ${existing.has(h) ? "already existed (password unchanged)" : "created"}; read-only rights on "${db}"`);
  }
  if (created.length) {
    console.log(`\n  Put these two lines into ${configFile(ROOT)} (shown only now):`);
    console.log(`    BACKUP_DB_USER=${backupUser}`);
    console.log(`    BACKUP_DB_PASSWORD=${password}`);
    console.log("  They are used by backups in BACKUP_MODE=direct (installed RMS). Docker mode keeps using the container.");
  }
}

async function main() {
  const db = value("--db") || "rms_prod";
  const cfg = loadConfig({ db }); // also checks that the name is safe (letters, digits, _)
  const appUser = readEnvFile().DB_USER || "rms_app";
  if (!/^[A-Za-z0-9_]+$/.test(appUser)) throw new Error(`Invalid DB_USER: ${appUser}`);

  // R8-BKUSER: only the backup user's rights for an existing database
  if (args.includes("--backup-user-only")) {
    const [[found]] = await sql(cfg, `SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='${db}'`);
    if (Number(found) === 0) throw new Error(`The database "${db}" does not exist. Nothing was changed.`);
    console.log(`RMS — backup user for the existing database "${db}" (mode: ${cfg.mode}); the database itself is not changed.\n`);
    await ensureBackupUser(cfg, db, appUser);
    console.log("\nOK  Backup user ready.");
    return;
  }
  const migrationsDir = join(ROOT, "database", "migrations");
  const migrations = readdirSync(migrationsDir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();

  console.log(`RMS — new production database "${db}" (mode: ${cfg.mode})`);
  console.log(`  migrations: ${migrations.join(", ")}`);
  console.log(`  seed data:  none (the database starts empty)`);
  console.log(`  app user:   ${appUser}\n`);

  // 1. never touch an existing database
  const [[exists]] = await sql(cfg, `SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='${db}'`);
  if (Number(exists) > 0) {
    console.error(`STOP  The database "${db}" already exists. Nothing was changed.`);
    console.error(`      This script only creates NEW databases. To bring back data, use: npm run restore`);
    process.exit(2);
  }

  // 2. create + migrations
  await sql(cfg, `CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  try {
    for (const f of migrations) {
      process.stdout.write(`  applying ${f} ... `);
      const c = sqlCommandFor(cfg, "mysql", ["--default-character-set=utf8mb4", db]);
      await run(c.cmd, c.args, { env: c.env, input: createReadStream(join(migrationsDir, f)) });
      console.log("ok");
    }
  } catch (e) {
    // The database was created a moment ago by this run and holds no data,
    // so it is removed again; the next attempt starts clean.
    console.log("FAILED");
    await sql(cfg, `DROP DATABASE IF EXISTS \`${db}\``).catch(() => {});
    throw new Error(`${e.message}\nThe half-made database "${db}" (created by this run, no data) was removed again.`);
  }

  // 3. limited rights for the application user (same as rms_dev / rms_test)
  const hosts = (await sql(cfg, `SELECT host FROM mysql.user WHERE user='${appUser}'`)).map((r) => r[0]);
  if (hosts.length === 0) {
    console.log(`\n  NOTE: the user "${appUser}" does not exist on this server; no rights were given.`);
  }
  for (const h of hosts) {
    await sql(cfg, `GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON \`${db}\`.* TO '${appUser}'@'${h.replace(/'/g, "")}'`);
    console.log(`  rights given to ${appUser}@${h} (SELECT, INSERT, UPDATE, DELETE, EXECUTE)`);
  }

  // 4. check
  const { counts, routines } = await tableCounts(cfg, db);
  const tables = Object.keys(counts);
  const withData = tables.filter((t) => t !== "schema_migrations" && counts[t] > 0);
  const okTables = tables.length >= 8 && withData.length === 0;
  console.log(`\n  tables: ${tables.length} (${tables.join(", ")})`);
  console.log(`  stored procedures: ${routines}`);
  console.log(`  rows in tables (except schema_migrations): ${withData.length ? withData.join(", ") : "none — empty, as it should be"}`);
  if (!okTables || routines < 25) throw new Error("The new database does not look complete (expected 8 tables and 25 procedures).");

  // 5. optional: backup-only user (R8-BKUSER)
  if (args.includes("--with-backup-user")) {
    console.log("");
    await ensureBackupUser(cfg, db, appUser);
  }

  console.log(`\nOK  "${db}" is ready and empty.`);
  console.log(`Next: npm run create-manager -- --db ${db}`);
  console.log(`Then set DB_NAME=${db} in .env.local and restart RMS.`);
}

main().catch((e) => {
  console.error(`\nERROR  ${e.message}`);
  process.exit(1);
});
