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

## Backup (Windows Command Prompt, from the project folder)
Keep backups OUTSIDE the project folder — they contain data and must never be committed.
```
mkdir G:\Projects\rms-backups
docker compose --env-file .env.local exec -T db sh -c "mysqldump -uroot -p$MYSQL_ROOT_PASSWORD --routines --single-transaction rms_dev" > G:\Projects\rms-backups\backup_rms_dev.sql
```
- `-T` is required: without it the output file can be corrupted.
- `$MYSQL_ROOT_PASSWORD` is read *inside* the container, so the password never appears on screen.
- `--routines` includes the 25 stored procedures.

## Restore check (into a separate scratch database — the original is not touched)
```
docker compose --env-file .env.local exec -T db sh -c "mysql -uroot -p$MYSQL_ROOT_PASSWORD -e 'CREATE DATABASE rms_restore_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'"
docker compose --env-file .env.local exec -T db sh -c "mysql -uroot -p$MYSQL_ROOT_PASSWORD rms_restore_check" < G:\Projects\rms-backups\backup_rms_dev.sql
docker compose --env-file .env.local exec -T db sh -c "mysql -uroot -p$MYSQL_ROOT_PASSWORD -e 'SELECT COUNT(*) FROM rms_dev.orders; SELECT COUNT(*) FROM rms_restore_check.orders'"
docker compose --env-file .env.local exec -T db sh -c "mysql -uroot -p$MYSQL_ROOT_PASSWORD -e 'DROP DATABASE rms_restore_check'"
```
The two counts must be equal. The last line removes only the scratch copy.
To restore *for real* (replacing rms_dev), ask first — that is a destructive action.

## Changing the schema later
Never edit a migration that has already been applied. Add a new numbered file
(e.g. `003_add_xyz.sql`) and record it in `schema_migrations` at the end of the file.

## ⚠️ Full reset (deletes ALL data in the RMS Docker database)
`docker compose --env-file .env.local down -v` removes the RMS database volume.
The next `up -d` rebuilds it from these files. This never affects XAMPP or any other database.
Only do this with explicit approval.
