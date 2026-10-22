import { NextResponse } from "next/server";
import { saveSettings, validateSettings } from "@/lib/backupManager";
import { getBackupStatus } from "@/lib/backupStatus";

// BACKUP-3 (manager only): save the automatic backup schedule
export async function PUT(req) {
  try {
    const body = await req.json().catch(() => null);
    const { settings, error } = validateSettings(body);
    if (error) return NextResponse.json({ error }, { status: 400 });
    saveSettings(settings);
    return NextResponse.json({ success: true, ...getBackupStatus() });
  } catch (err) {
    console.error("Backup settings error:", err);
    return NextResponse.json({ error: "Could not save the backup settings" }, { status: 500 });
  }
}
