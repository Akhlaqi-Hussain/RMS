# Second backup copy (`BACKUP_COPY_DIR`)

## Why a second copy matters

Backups live in `..\rms-backups`, on the **same disk** as RMS. If that disk dies or the PC is stolen, those backups are lost too.

With `BACKUP_COPY_DIR`, every backup (scheduled, manual or "Back up now") is **also** written to a second place. That's the 3-2-1 idea: keep **3** copies, on **2** different devices, with **1** of them away from the PC.

## What you need

One of these:

- A USB stick or USB disk of at least 8 GB that **stays plugged in**.
- A second internal disk, for example `D:`.

A backup is about 0.5 MB plus the size of the menu pictures.

**The second copy is not cleaned up automatically.** The main folder keeps about 24 files (7 daily, 5 weekly and 12 monthly). The copy folder keeps **every** backup, which is about one file per night, or about 365 a year. With 10 MB of pictures, that's about 4 GB a year. Every few months, delete the old files that aren't `…monthly…` files by hand.

## Steps

1. **Plug in the USB disk** and note its letter in File Explorer, for example `E:`.

2. **Create the folder:**

   ```
   mkdir E:\RMS-backups
   ```

3. **Tell RMS to use it.** Open `.env.local` in Notepad and add this line (with your letter):

   ```
   BACKUP_COPY_DIR=E:\RMS-backups
   ```

   Save the file.

4. **Restart RMS** (`npm start` again, or sign out and in if autostart is on).

5. **Test it.** Go to **Manage → Backups** and press **Back up now**. Then check that:

   - the box "Second copy" says it is **on**, and
   - running `dir E:\RMS-backups` shows the same `rms-backup_…tar.gz` file as `npm run backup:list`.

6. **Check that the copy can be restored.** This is a read-only check:

   ```
   npm run backup:verify -- E:\RMS-backups\<file name>
   ```

   Expected: `OK … checked`.

## Good habits

- **Once a week**, look at Manage → Backups. The last backup should be from last night, and the card should be green, not amber.
- **Once a month**, copy the newest `…monthly.tar.gz` to a USB stick that you keep **at home**. That covers fire and theft.
- **If the USB disk is unplugged**, the main backup still works and the log notes that the copy failed. Plug it back in and press Back up now.
- **If the drive letter changes** (another USB device took `E:`), set the letter again in Windows Disk Management, or update `.env.local`.

## Undo

Delete the `BACKUP_COPY_DIR=` line from `.env.local` and restart RMS. Files that are already on the USB disk stay there.
