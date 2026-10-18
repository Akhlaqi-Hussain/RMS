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

## Backup
```
docker compose --env-file .env.local exec db sh -c "mysqldump -uroot -p$MYSQL_ROOT_PASSWORD --routines --single-transaction rms_dev" > backup_rms_dev.sql
```
(`$MYSQL_ROOT_PASSWORD` is read inside the container, so the password never appears on screen.
This assumes the root password has no spaces.) Keep backup files outside Git — they may contain data.
This command will be verified on Windows during Gate 5.

## Restore (into an empty database only)
Restore is tested and documented step by step during Gate 5.

## Changing the schema later
Never edit a migration that has already been applied. Add a new numbered file
(e.g. `003_add_xyz.sql`) and record it in `schema_migrations` at the end of the file.

## ⚠️ Full reset (deletes ALL data in the RMS Docker database)
`docker compose --env-file .env.local down -v` removes the RMS database volume.
The next `up -d` rebuilds it from these files. This never affects XAMPP or any other database.
Only do this with explicit approval.
