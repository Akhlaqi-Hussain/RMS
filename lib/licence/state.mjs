// R9-LIC: licence status of this RMS installation (server only).
//
// Is the licence check active?
//   - in the CLIENT PACKAGE (npm run package): ALWAYS. This is built into the
//     program (RMS_LICENCE_BUILD="package" is written into the code at build
//     time, see next.config.mjs), so no setting can switch it off;
//   - in a development build: only when RMS_LICENCE=required (for testing).
// Which key checks the codes?
//   - the owner's public key (lib/licence/ownerKey.mjs), and
//   - in a development build only, RMS_LICENCE_TEST_PUBLIC_KEY (automatic tests).
//
// States: missing · invalid · valid · expiring (≤ 30 days left) · expired · clock
//   blocked   (missing/invalid): only the licence page works
//   read-only (expired/clock)  : log in, look, print, back up; no new orders,
//                                payments or changes
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pool from "../db.js";
import { licenceDir } from "../rmsPaths.mjs";
import { LICENCE_CONTACT } from "./contact.mjs";
import { dayNumber, publicKeyFromBase64, readActivationCode, todayIso } from "./format.mjs";
import { thisMachine } from "./machine.mjs";
import { OWNER_PUBLIC_KEY } from "./ownerKey.mjs";

const BUILD = process.env.RMS_LICENCE_BUILD; // replaced by "package" or "dev" when RMS is built
export const WARN_DAYS = 30;
const CACHE_MS = 30 * 1000;
const CLOCK_SLACK_MS = 24 * 3600 * 1000; // the clock may be off by up to a day
const LAST_SEEN_STEP_MS = 3600 * 1000;

const g = (globalThis.__rmsLicence ||= { status: null, at: 0 });

export function licenceEnforced() {
  return BUILD === "package" || process.env.RMS_LICENCE === "required";
}

function publicKey() {
  const test = BUILD !== "package" ? process.env.RMS_LICENCE_TEST_PUBLIC_KEY : "";
  return publicKeyFromBase64(test || OWNER_PUBLIC_KEY);
}

const dir = () => licenceDir(process.cwd());
const licenceFile = () => join(/*turbopackIgnore: true*/ dir(), "licence.txt");
const lastSeenFile = () => join(/*turbopackIgnore: true*/ dir(), "last-seen.txt");

function readText(file) {
  try {
    return existsSync(/*turbopackIgnore: true*/ file) ? readFileSync(/*turbopackIgnore: true*/ file, "utf8").trim() : "";
  } catch {
    return "";
  }
}

function writeAtomic(file, text) {
  mkdirSync(/*turbopackIgnore: true*/ dir(), { recursive: true });
  writeFileSync(/*turbopackIgnore: true*/ file + ".tmp", text);
  renameSync(/*turbopackIgnore: true*/ file + ".tmp", file);
}

// The clock must not be set back: compare with the latest time RMS has seen
// (kept in last-seen.txt) and with the newest order in the database.
async function clockProblem(now) {
  const seen = Number(readText(lastSeenFile())) || 0;
  let newest = 0;
  try {
    const [rows] = await pool.query("SELECT MAX(created_at) AS newest FROM orders");
    newest = rows[0]?.newest ? new Date(rows[0].newest).getTime() : 0;
  } catch {
    // no database at the moment: only the file is used
  }
  if (now < seen - CLOCK_SLACK_MS || now < newest - CLOCK_SLACK_MS) return true;
  if (now > seen + LAST_SEEN_STEP_MS) {
    try { writeAtomic(lastSeenFile(), String(now)); } catch { /* not writable: check again later */ }
  }
  return false;
}

async function computeStatus() {
  const enforced = licenceEnforced();
  const machine = thisMachine();
  const base = { enforced, machineCode: machine.code, contact: LICENCE_CONTACT, warnDays: WARN_DAYS };
  const code = readText(licenceFile());
  if (!code) return { ...base, state: "missing" };
  const r = readActivationCode(code, { publicKey: publicKey(), machine: machine.bytes });
  if (!r.ok) return { ...base, state: "invalid" };
  const { number, issued, expires } = r.licence;
  const now = Date.now();
  const daysLeft = dayNumber(expires) - dayNumber(todayIso(new Date(now)));
  const info = { ...base, licenceNo: number, issued, expires, daysLeft };
  if (enforced && (await clockProblem(now))) return { ...info, state: "clock" };
  if (daysLeft < 0) return { ...info, state: "expired" };
  if (daysLeft <= WARN_DAYS) return { ...info, state: "expiring" };
  return { ...info, state: "valid" };
}

// Full status (cached for 30 seconds), plus what it means for access.
export async function licenceStatus({ fresh = false } = {}) {
  if (fresh || !g.status || Date.now() - g.at > CACHE_MS) {
    g.status = await computeStatus();
    g.at = Date.now();
  }
  const s = g.status;
  return {
    ...s,
    blocked: s.enforced && (s.state === "missing" || s.state === "invalid"),
    readOnly: s.enforced && (s.state === "expired" || s.state === "clock"),
  };
}

// Enter a new activation code. Never makes things worse: a code that ends
// EARLIER than the current valid licence is refused.
// Returns { ok:true, status } or { ok:false, reason } with reason:
// format · signature (not for this computer) · expired · older
export async function activateLicence(text) {
  const machine = thisMachine();
  const r = readActivationCode(text, { publicKey: publicKey(), machine: machine.bytes });
  if (!r.ok) return { ok: false, reason: r.reason };
  const today = todayIso();
  if (dayNumber(r.licence.expires) < dayNumber(today)) return { ok: false, reason: "expired" };
  // compare with the stored licence whenever it is genuine (valid, expiring,
  // expired or clock state) — so an old code can never shorten a licence,
  // not even after the computer's clock was set back
  const current = await licenceStatus({ fresh: true });
  if (current.expires && dayNumber(r.licence.expires) < dayNumber(current.expires)) {
    return { ok: false, reason: "older" };
  }
  writeAtomic(licenceFile(), String(text).trim() + "\n");
  return { ok: true, status: await licenceStatus({ fresh: true }) };
}

// Server texts used by proxy.js and the routes (translated in lib/i18n/serverMessages.js)
export const LICENCE_REQUIRED = "Licence required";
export const LICENCE_READ_ONLY = "Licence expired: read-only";
