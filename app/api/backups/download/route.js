import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { backupFilePath } from "@/lib/backupManager";

// BACKUP-3 (manager only): download one backup file, e.g. to copy it to a USB disk.
// Only exact backup file names from the backup folder are accepted.
export async function GET(req) {
  const name = new URL(req.url).searchParams.get("name");
  const file = backupFilePath(name);
  if (!file) return Response.json({ error: "Backup not found" }, { status: 404 });
  const size = statSync(/*turbopackIgnore: true*/ file).size;
  return new Response(Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ file)), {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
