import { readFile } from "fs/promises";
import path from "path";

// BUG-12: in production (`npm start`) Next.js only serves files that were in
// public/ when the server started, so a menu picture uploaded later returned
// 404 until a restart. Next.js serves files from public/ first; only when it
// doesn't know a file does the request reach this route, which reads the
// picture from public/uploads/menu/ itself.
// Strict name check: only a plain file name with an image extension — no
// folders, no "..", so nothing outside the upload folder can ever be read.

const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$/i;

export async function GET(req, { params }) {
  const { file } = await params;

  if (!SAFE_NAME.test(file) || file.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");
  const fullPath = path.join(uploadDir, file);
  if (path.dirname(fullPath) !== uploadDir) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(fullPath);
    const ext = file.split(".").pop().toLowerCase();
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": TYPES[ext],
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
