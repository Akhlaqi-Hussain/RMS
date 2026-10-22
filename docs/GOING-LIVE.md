# Going live: RMS on one restaurant PC

This guide sets up RMS for **real use** on one Windows PC in the restaurant. Phones, tablets and other PCs on the same Wi-Fi can use it too, and no internet is needed.

> **Going live is the owner's decision.** Everything below is prepared and tested on a copy, but nothing here runs by itself. Do the steps in order and check each result before you go on.

## What you get

| | |
|---|---|
| **Database** | `rms_prod`: a new, empty database (no test staff, no test orders). It sits next to `rms_dev` and `rms_test`, which stay untouched for development and tests. |
| **First login** | One manager account that you create with a script. The password is never shown or stored in plain text. |
| **Access** | The PC itself: `http://localhost:3000`. Other devices on the same network: `http://<PC-address>:3000`. |
| **Start** | Optional: RMS starts by itself 2 minutes after you sign in to Windows. |
| **Backups** | Automatic (Manage → Backups), with a second copy on a USB disk or second drive. |

## Before you start

- Round 5 is merged and `npm ci` has been run.
- Docker Desktop is running and `docker ps` shows `rms-mysql`.
- A backup of `rms_dev` exists (`npm run backup`), just in case.
- Development is done in **another** folder or on another PC. The live PC only runs RMS.

---

## Step 1: Create the empty production database

```
npm run db:setup-prod
```

Expected ending:

```
OK  "rms_prod" is ready and empty.
```

The script **never changes an existing database**. If `rms_prod` already exists, it stops with `STOP … Nothing was changed.`

## Step 2: Create the first manager

```
npm run create-manager -- --db rms_prod
```

Answer the questions: first name, last name, username, phone, and the password twice. The password needs at least 10 characters, with letters and digits, and shows as `*****` while you type.

Expected: `OK  Manager "<username>" created …`

Write the username down. Keep the password somewhere safe, offline.

## Step 3: Switch RMS to the production database

1. Open `.env.local` in Notepad and change one line:

   ```
   DB_NAME=rms_prod
   ```

2. While you have the file open, change `JWT_SECRET` to a **new** long random value. This signs everyone out of the test sessions. You can generate a value with:

   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. Save the file.

> In your command window, `echo %DB_NAME%` must print `%DB_NAME%`. If it prints a name, a leftover `set DB_NAME=…` would override the file, so open a new window.

## Step 4: Build and start

```
npm run build
npm start
```

Open `http://localhost:3000` and log in with the new manager. The dashboard is empty, which is correct.

Then set up the restaurant:

- **Manage → Tables**: add the tables.
- **Manage → Menu**: add the categories and items, with pictures.
- **Manage → Staff**: add the waiters, cashiers and chefs, each with their own password.

## Step 5: Backups for real data

1. In `.env.local`, add the second copy (use your USB or second-disk letter):

   ```
   BACKUP_COPY_DIR=E:\RMS-backups
   ```

2. Restart RMS: close the window, then run `npm start` again.
3. Go to **Manage → Backups**, check that automatic backups are on (every day at 23:30 is fine), then press **Back up now**.

   Expected: a new `…rms_prod…manual.tar.gz` file, and the second-copy box says it is on.

The full steps are in [`BACKUP-COPY.md`](BACKUP-COPY.md).

## Step 6 (optional): Use RMS from phones, tablets and other PCs

1. **Find the PC's address.** Run `ipconfig` and note the *IPv4 Address* of the Wi-Fi or Ethernet adapter, for example `192.168.1.20`.

   Ask whoever manages the router to give this PC a **fixed address** (a "DHCP reservation"), so the address stays the same.

2. **Make sure the network is "Private".** In Windows Settings → Network & Internet → (your network) → **Private network**.

3. **Allow port 3000 in the firewall.** Open the command prompt as administrator and run:

   ```
   netsh advfirewall firewall add rule name="RMS (port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=private
   ```

   To remove the rule later: `netsh advfirewall firewall delete rule name="RMS (port 3000)"`

4. On the phone (same Wi-Fi), open `http://192.168.1.20:3000`.

> **Known limitation, under review (PROD-2).** With `npm start`, the login cookie is marked "secure" and is only sent over HTTPS or to `localhost`. Phones and other PCs that use the plain `http://192.168.…` address therefore can't stay logged in. The proposed fix is a setting `COOKIE_SECURE=false` for a trusted restaurant network. Until it is approved and installed, use RMS on the PC itself.

## Step 7 (optional): Start RMS automatically

1. Docker Desktop → Settings → General → turn on **Start Docker Desktop when you sign in**.
2. Run:

   ```
   powershell -ExecutionPolicy Bypass -File scripts\windows\autostart-rms.ps1
   ```

   Expected: `Scheduled task 'RMS Server' is ready …`

3. Sign out and back in. After about 2 minutes, a minimised **RMS Server** window appears and `http://localhost:3000` works. Closing that window stops RMS.

   The log is in `..\rms-logs\rms-server.log`.

To undo: `powershell -ExecutionPolicy Bypass -File scripts\windows\autostart-rms.ps1 -Remove`

## Step 8: Final checks before opening

Work through [`TEST-CHECKLIST.md`](TEST-CHECKLIST.md): receipt printer, iPhone/Android, offline, and backup and restore.

---

## Rules for the live PC

- **Restores:** `npm run restore -- --latest` brings back the newest `rms_prod` backup (it asks you to type the name first, and makes a safety backup).
- **No test restores on the live folder.** A restore also replaces the menu pictures folder, and that folder is shared by `rms_dev`, `rms_test` and `rms_prod`. Restoring a test backup would replace the live menu pictures. Practise restores on a development copy (see PROD-3 in the decisions log).
- **No API tests against `rms_prod`.** They create and change data. They are only for `rms_test`.
- **Updates:** before installing a new RMS version, press **Back up now**. Then `git pull`, `npm ci`, `npm run build` and restart.
- **Passwords:** each person has their own account. When someone leaves, deactivate the account in Manage → Staff.

## Going back

| What | How |
|---|---|
| Back to the development data | Set `DB_NAME=rms_dev` in `.env.local` and restart. `rms_prod` stays as it is. |
| Stop autostart | `autostart-rms.ps1 -Remove` |
| Close the firewall | `netsh advfirewall firewall delete rule name="RMS (port 3000)"` |
| Remove `rms_prod` | Only with a backup in hand, and only by the administrator. This is deliberately not a script. |
