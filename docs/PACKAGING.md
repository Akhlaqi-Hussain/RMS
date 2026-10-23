# Making the client package (R8-PKG)

The client never receives this repository. It receives a **package**: the built program only, without source code, tests, test data or settings. `npm run package` makes that package and checks it.

> Status (Round 8): the package is the program part of the future installer. **Node.js itself, the MySQL server, the Windows services and the installer (`RMS-Setup.exe`) come in Round 10.** Until then the package is for checking only; restaurants keep using the normal setup (`docs/GOING-LIVE.md`).

## 1. Make the package (on this Windows PC)

```
cd /d G:\Projects\RMS-repo
npm run package
```

It takes a few minutes. The last line must be:

```
OK  Package ready and checked.
```

Build the package that goes to clients **on Windows**, so the Windows-specific parts are the right ones. The normal `npm run build` / `npm start` are not affected: the package is built in the separate folders `.next-package` and `dist` (both ignored by Git).

## 2. What is in `dist\RMS\app`

| Part | Contents |
|---|---|
| `server.js`, `.next-package\` | the built program (no source code, no source maps) |
| `node_modules\` | only what the program needs while it runs |
| `public\` | fonts and icons — **not** the demo menu pictures |
| `scripts\`, `lib\rmsPaths.mjs` | backup, restore, first manager, empty-database setup (+ `mysql2` and `bcrypt` at the locked versions) |
| `database\migrations\` | to create an **empty** database — no test data |
| `LICENSE`, `VERSION.txt` | licence; version, Git commit and build date |

## 3. What the check refuses

The script stops with `PACKAGE FAILED` and a list if the package contains any of these:
- a settings file (`.env…`, `rms.env`, `admin.env`)
- **any secret value from your own settings file** (`JWT_SECRET`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `BACKUP_DB_PASSWORD`)
- Git data, `tests\`, test data (`database\seeds`), source folders (`app\`, `components\`, …)
- source maps (`.map`) or key files (`.pem`, `.key`, private key files)
- or if something needed is missing (for example the Windows `bcrypt` file)

`dist\RMS\PACKAGE-REPORT.txt` lists every file with its SHA-256 checksum.

## 4. The data folder (R8-DATA)

An installed RMS keeps all its data in one folder, given by `RMS_DATA_DIR` (planned: `C:\ProgramData\RMS`):

```
C:\ProgramData\RMS\
  config\rms.env      settings (like .env.local)
  config\admin.env    MYSQL_ROOT_PASSWORD — readable by Administrators only
  uploads\menu\       menu pictures
  backups\            backups (unless BACKUP_DIR says otherwise)
  logs\               log files
```

So the program folder is never written to, and upgrading or uninstalling the program never touches the restaurant's data. Without `RMS_DATA_DIR` (your development PC) everything stays where it is today.

## 5. Backups without the root password (R8-BKUSER)

In the installed setup (`BACKUP_MODE=direct`), backups use a **backup-only** database user that may only *read* the restaurant's database. The root password is needed only for restore and database setup, and is kept in `admin.env`.

Create the user (once per database):

```
npm run db:setup-prod -- --db rms_prod --backup-user-only
```

It prints two lines, `BACKUP_DB_USER=…` and `BACKUP_DB_PASSWORD=…`, to put into the settings file. In Round 10 the installer does all of this automatically. With Docker (today's setup) backups keep working as before.
