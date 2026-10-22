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
// =====================================================================
import { createReadStream, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadConfig, readEnvFile, run, sql, tableCounts, sqlCommandFor } from "./backup-lib.mjs";

const args = process.argv.slice(2);
const value = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

async function main() {
  const db = value("--db") || "rms_prod";
  const cfg = loadConfig({ db }); // also checks that the name is safe (letters, digits, _)
  const appUser = readEnvFile().DB_USER || "rms_app";
  if (!/^[A-Za-z0-9_]+$/.test(appUser)) throw new Error(`Invalid DB_USER: ${appUser}`);
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

  console.log(`\nOK  "${db}" is ready and empty.`);
  console.log(`Next: npm run create-manager -- --db ${db}`);
  console.log(`Then set DB_NAME=${db} in .env.local and restart RMS.`);
}

main().catch((e) => {
  console.error(`\nERROR  ${e.message}`);
  process.exit(1);
});
