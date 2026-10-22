import { NextResponse } from "next/server";
import { getBackupStatus } from "@/lib/backupStatus";

// BACKUP-2: manager-only (see proxy.js). Read-only: it never creates,
// deletes or returns backup files, it only reports when the last one was made.
export async function GET() {
  try {
    return NextResponse.json(getBackupStatus());
  } catch (error) {
    console.error("Backup status error:", error);
    return NextResponse.json({ error: "Could not read the backup status" }, { status: 500 });
  }
}
