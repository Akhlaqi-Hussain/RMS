# RMS Database

The RMS app stores its data in **MySQL 8.4**, which runs in Docker on your own PC.
This folder holds everything needed to rebuild the database from nothing.

| Path | What it is |
|---|---|
| `migrations/001_create_tables.sql` | Creates the 8 tables (never deletes anything) |
| `migrations/002_create_procedures.sql` | Creates the 25 stored procedures the app calls |
| `seeds/dev_seed.sql` | **Fake** test data. Development/test only — never production |
| `docker-init/01-init.sh` | Runs **once**, when the Docker database is created for the first time |

## Databases
- `rms_dev` — daily development
- `rms_test` — automated tests (safe to reset)

Both start with the same fake data. Test accounts: `manager1`, `cashier1`, `waiter1`, `chef1`,
all with the dev-only password `DevOnly@123`.

The app connects as the limited user `rms_app`, which can read and write data but
**cannot create, change or delete tables**.

## Everyday commands (run in the project folder)
| Task | Command |
|---|---|
| Start the database | `docker compose --env-file .env.local up -d` |
| Check it is healthy | `docker compose --env-file .env.local ps` |
| Stop it (data is kept) | `docker compose --env-file .env.local stop` |
| See the first-start log | `docker compose --env-file .env.local logs db` |

## Backup and restore

RMS has a complete backup system. Managers use **Manage → Backups** in the app (back up now,
automatic schedule, download). The full guide is in the main [README](../README.md#backup-and-restore).

| Task | Command (in the project folder) |
|---|---|
| Back up now | `npm run backup` |
| List backups | `npm run backup:list` |
| Check a backup file | `npm run backup:verify -- <file>` |
| Restore the newest backup | `npm run restore -- --latest` |
| Restore a specific file | `npm run restore -- <file>` |

Each backup is one `.tar.gz` file with the database dump (tables, data, the 25 stored
procedures), the menu pictures and a manifest with checksums and row counts.
A restore always makes a safety backup of the current data first, and checks
every table's row count afterwards.

## Changing the schema later
Never edit a migration that has already been applied. Add a new numbered file
(e.g. `003_add_xyz.sql`) and record it in `schema_migrations` at the end of the file.

## ⚠️ Full reset (deletes ALL data in the RMS Docker database)
`docker compose --env-file .env.local down -v` removes the RMS database volume.
The next `up -d` rebuilds it from these files. This never affects XAMPP or any other database.
Only do this with explicit approval.
