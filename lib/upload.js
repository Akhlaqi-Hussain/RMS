import crypto from "crypto";

// SEC-2: server-side checks for uploaded menu images.
// The browser form already checks type and size, but anyone can bypass the
// browser, so the server checks again and never trusts the client's file name.

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — same limit as the form (schemas/menuSchema.jsx)

// Detect the real image type from the file's first bytes ("magic numbers"),
// not from the name or the type the browser claims.
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/**
 * Validates an uploaded image and returns a safe file name.
 * @param {Buffer} buffer - the uploaded file's bytes
 * @returns {{ ok: true, filename: string } | { ok: false, error: string }}
 */
export function validateMenuImage(buffer) {
  if (!buffer || buffer.length === 0) {
    return { ok: false, error: "فایل تصویر خالی است" };
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: "حجم تصویر نباید بیشتر از ۵MB باشد" };
  }
  const ext = detectImageType(buffer);
  if (!ext) {
    return { ok: false, error: "فقط تصاویر jpeg، png یا webp مجاز هستند" };
  }
  // Safe name: timestamp + random part + real extension. No user text at all,
  // so it can never contain "../" or other path tricks.
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  return { ok: true, filename };
}
