import { NextResponse } from "next/server";
import { listBackups, startBackup } from "@/lib/backupManager";
import { getBackupStatus } from "@/lib/backupStatus";

// BACKUP-3 (manager only, see proxy.js)
// GET  → status, schedule settings and the list of backups
// POST → make a backup now (the same program as `npm run backup`)
export async function GET() {
  try {
    const backups = listBackups().map((b) => ({ name: b.name, tier: b.tier, createdAt: b.when.toISOString(), bytes: b.bytes }));
    return NextResponse.json({ ...getBackupStatus(), backups });
  } catch (error) {
    console.error("Backup list error:", error);
    return NextResponse.json({ error: "Could not read the backups" }, { status: 500 });
  }
}

export async function POST() {
  const run = startBackup({ auto: false });
  if (!run.started) {
    return NextResponse.json({ error: "A backup is already running" }, { status: 409 });
  }
  const result = await run.finished;
  if (!result.ok) {
    console.error("Backup failed:", result.message);
    return NextResponse.json({ error: "Backup failed", detail: result.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, name: result.name, message: result.message });
}
