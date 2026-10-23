// R9-LIC: the licence and machine code formats — shared, unchanged, by RMS
// (which only CHECKS codes) and by the owner's licence tool (which also SIGNS
// them). Node.js built-in crypto only (Ed25519), no extra packages.
//
// Machine code  : 10 bytes from a one-way hash of the computer's ID, written
//                 as 16 characters + 1 check character: XXXX-XXXX-XXXX-XXXX-C
// Activation code: "RMS1-" + 73 bytes (9 bytes licence data + 64 bytes
//                 signature) + 2 check characters, in groups of 7.
//   licence data = version(1) · licence number(3) · issued day(2) · last valid day(2) · flags(1)
//   signature    = Ed25519 over "RMS-LIC-v1" + licence data + machine code bytes
//   so a code only works on the machine it was made for, and any change to
//   the dates or the number breaks the signature.
// Characters: Crockford base32 (0-9 A-Z without I L O U); when reading,
// O→0, I/L→1, lower case and dashes/spaces are accepted.
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DOMAIN = Buffer.from("RMS-LIC-v1", "ascii");
const VERSION = 1;
const DAY0 = Date.UTC(2024, 0, 1); // day numbers count from 1 Jan 2024
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex"); // Ed25519 public key header
const PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex"); // Ed25519 private key header

// ---------- base32 ----------
export function toBase32(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function fromBase32(text, byteLength) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of text) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    value = (value << 5) | v; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return out.length >= byteLength ? Buffer.from(out.slice(0, byteLength)) : null;
}

export function normalize(text) {
  return String(text ?? "").toUpperCase().replace(/[O]/g, "0").replace(/[IL]/g, "1").replace(/[^0-9A-Z]/g, "");
}

const checkChars = (buf, n) => toBase32(createHash("sha256").update(buf).digest()).slice(0, n);
const group = (s, size) => s.match(new RegExp(`.{1,${size}}`, "g")).join("-");

// ---------- days ----------
export function dayNumber(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - DAY0) / 86400000);
}
export function dayToIso(n) {
  return new Date(DAY0 + n * 86400000).toISOString().slice(0, 10);
}
// today's calendar date on this computer (Kabul time on the restaurant PC)
export function todayIso(now = new Date()) {
  const pad = (v) => String(v).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ---------- machine code ----------
export function machineBytes(machineId) {
  return createHash("sha256").update(`RMS-machine-v1|${String(machineId).trim().toLowerCase()}`).digest().subarray(0, 10);
}
export function formatMachineCode(bytes) {
  return `${group(toBase32(bytes), 4)}-${checkChars(bytes, 1)}`;
}
export function parseMachineCode(text) {
  const s = normalize(text);
  if (s.length !== 17) return null;
  const bytes = fromBase32(s.slice(0, 16), 10);
  if (!bytes || checkChars(bytes, 1) !== s[16]) return null;
  return bytes;
}

// ---------- keys ----------
export function publicKeyFromBase64(b64) {
  const raw = Buffer.from(String(b64 || ""), "base64");
  if (raw.length !== 32) return null;
  return createPublicKey({ key: Buffer.concat([SPKI_PREFIX, raw]), format: "der", type: "spki" });
}
export function privateKeyFromRaw(raw) {
  return createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, raw]), format: "der", type: "pkcs8" });
}
export function rawKeys(keyPair) {
  return {
    publicRaw: keyPair.publicKey.export({ format: "der", type: "spki" }).subarray(SPKI_PREFIX.length),
    privateRaw: keyPair.privateKey.export({ format: "der", type: "pkcs8" }).subarray(PKCS8_PREFIX.length),
  };
}

// ---------- activation code ----------
function packData({ number, issued, expires, flags = 0 }) {
  const b = Buffer.alloc(9);
  b[0] = VERSION;
  b.writeUIntBE(number, 1, 3);
  b.writeUInt16BE(dayNumber(issued), 4);
  b.writeUInt16BE(dayNumber(expires), 6);
  b[8] = flags;
  return b;
}
function unpackData(b) {
  return { version: b[0], number: b.readUIntBE(1, 3), issued: dayToIso(b.readUInt16BE(4)), expires: dayToIso(b.readUInt16BE(6)), flags: b[8] };
}

// Owner tool only: make a code for one machine.
export function makeActivationCode({ privateKey, machine, number, issued, expires }) {
  if (!Number.isInteger(number) || number < 1 || number > 0xffffff) throw new Error("licence number out of range");
  if (dayNumber(expires) < dayNumber(issued)) throw new Error("end date before start date");
  const data = packData({ number, issued, expires });
  const signature = sign(null, Buffer.concat([DOMAIN, data, machine]), privateKey);
  const all = Buffer.concat([data, signature]);
  return `RMS1-${group(toBase32(all) + checkChars(all, 2), 7)}`;
}

// Read a code. Returns { ok:false, reason } or { ok:true, licence }.
// reason: "format" (typing mistake / not an RMS code) or "signature" (not for this computer, or changed).
export function readActivationCode(text, { publicKey, machine }) {
  let s = normalize(text);
  if (s.startsWith("RMS1")) s = s.slice(4);
  if (s.length !== 119) return { ok: false, reason: "format" };
  const all = fromBase32(s.slice(0, 117), 73);
  if (!all || checkChars(all, 2) !== s.slice(117)) return { ok: false, reason: "format" };
  const data = all.subarray(0, 9);
  const licence = unpackData(data);
  if (licence.version !== VERSION) return { ok: false, reason: "format" };
  if (!publicKey || !verify(null, Buffer.concat([DOMAIN, data, machine]), publicKey, all.subarray(9))) {
    return { ok: false, reason: "signature" };
  }
  return { ok: true, licence };
}
