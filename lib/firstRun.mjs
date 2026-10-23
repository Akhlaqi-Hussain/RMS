// R9-SETUP: first start of a new RMS (no active manager in the database yet).
//
// Who may create the first manager? Only someone who can read a file on the
// RMS computer itself: a one-time SETUP CODE is written to
//   <licence folder>/setup-code.txt   (installed: C:\ProgramData\RMS\licence)
// and printed in the server log. A stranger on the Wi-Fi cannot see it.
// (Checking "is the request coming from this computer?" is not used: the
// address header can be faked.) The code is deleted once the manager exists.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pool from "./db.js";
import { licenceDir } from "./rmsPaths.mjs";
import { normalize, toBase32 } from "./licence/format.mjs";

const g = (globalThis.__rmsFirstRun ||= { needed: null, at: 0 });
const CACHE_MS = 15 * 1000;

const setupFile = () => join(/*turbopackIgnore: true*/ licenceDir(process.cwd()), "setup-code.txt");

// true when the database has no active manager (cached 15 s; false if the database is unreachable)
export async function firstRunNeeded({ fresh = false } = {}) {
  if (fresh || g.needed === null || Date.now() - g.at > CACHE_MS) {
    try {
      const [rows] = await pool.query("SELECT COUNT(*) AS n FROM staff WHERE role = 'manager' AND is_active = 1");
      g.needed = Number(rows[0].n) === 0;
    } catch {
      g.needed = false;
    }
    g.at = Date.now();
  }
  return g.needed;
}

export function forgetFirstRunState() {
  g.needed = null;
}

// Make (once) and return the setup code, e.g. "7KQ3M-9TX2D".
export function ensureSetupCode() {
  const file = setupFile();
  try {
    const existing = existsSync(/*turbopackIgnore: true*/ file) ? readFileSync(/*turbopackIgnore: true*/ file, "utf8").trim() : "";
    if (existing) return existing;
  } catch {
    // make a new one below
  }
  const raw = toBase32(randomBytes(7)).slice(0, 10);
  const code = `${raw.slice(0, 5)}-${raw.slice(5)}`;
  mkdirSync(/*turbopackIgnore: true*/ licenceDir(process.cwd()), { recursive: true });
  writeFileSync(/*turbopackIgnore: true*/ file, code + "\n");
  console.log(`[setup] First-run setup code: ${code}  (also in ${file})`);
  return code;
}

export function setupCodeMatches(input) {
  let expected = "";
  try {
    expected = normalize(readFileSync(/*turbopackIgnore: true*/ setupFile(), "utf8"));
  } catch {
    return false;
  }
  const given = normalize(input);
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function removeSetupCode() {
  rmSync(/*turbopackIgnore: true*/ setupFile(), { force: true });
}
