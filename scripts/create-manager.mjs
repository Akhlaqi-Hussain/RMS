#!/usr/bin/env node
// =====================================================================
// RMS — create the first manager account (PROD-1).
//
//   npm run create-manager -- --db rms_prod
//   npm run create-manager -- --db rms_prod --another   (when a manager already exists)
//
// A new production database is empty, so nobody could log in. This asks for
// the manager's name, username, phone and password (the password is not shown
// while typing), checks them with the same rules as Manage → Staff, and saves
// the account through the same stored procedure the app uses (add_staff).
// The password is stored only as a bcrypt hash.
//
// Connection: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD from .env.local.
// Database:   --db <name>, otherwise DB_NAME from .env.local.
// =====================================================================
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { createInterface } from "node:readline";
import { readEnvFile } from "./backup-lib.mjs";

const args = process.argv.slice(2);
const value = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

// same rules as schemas/staffSchema.jsx, but a stronger password for the manager
const RULES = {
  name: [/^[؀-ۿa-zA-Z\s]{2,50}$/, "at least 2 letters (Dari/Pashto or English letters only)"],
  username: [/^[a-zA-Z0-9_]{4,50}$/, "at least 4 characters: English letters, digits or _"],
  phone: [/^07[0-9]{8}$/, "10 digits starting with 07, e.g. 0700123456"],
};
const passwordProblem = (p) =>
  p.length < 10 ? "at least 10 characters"
    : !/[A-Za-z]/.test(p) || !/[0-9]/.test(p) ? "must contain letters and digits"
      : null;

// ---- input: visible questions and hidden password ----
const lines = [];
let waiting = null;
const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (l) => { if (waiting) { const w = waiting; waiting = null; w(l); } else lines.push(l); });
let closed = false;
rl.on("close", () => { closed = true; if (waiting) waiting(null); });

function nextLine() {
  if (lines.length) return Promise.resolve(lines.shift());
  if (closed) return Promise.resolve(null);
  return new Promise((r) => { waiting = r; });
}

async function ask(question) {
  process.stdout.write(question);
  const a = await nextLine();
  if (a === null) throw new Error("Input ended. Nothing was saved.");
  return a.trim();
}

async function askHidden(question) {
  if (!process.stdin.isTTY) return ask(question); // e.g. automated test
  process.stdout.write(question);
  rl.pause();
  return new Promise((resolve, reject) => {
    let pw = "";
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    const onData = (buf) => {
      for (const ch of buf.toString("utf8")) {
        if (ch === "\u0003") { stdin.setRawMode(false); process.stdout.write("\n"); reject(new Error("Cancelled. Nothing was saved.")); return; }
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          rl.resume();
          resolve(pw);
          return;
        }
        if (ch === "\u0008" || ch === "\u007f") { if (pw.length) { pw = pw.slice(0, -1); process.stdout.write("\b \b"); } continue; }
        pw += ch;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

async function askValid(question, [re, hint]) {
  for (;;) {
    const a = await ask(question);
    if (re.test(a)) return a;
    console.log(`   → ${hint}`);
  }
}

async function main() {
  const env = readEnvFile();
  const db = value("--db") || env.DB_NAME;
  if (!db || !/^[A-Za-z0-9_]+$/.test(db)) throw new Error("Give the database: --db rms_prod");

  const conn = await mysql.createConnection({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT) || 3307,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: db,
  });
  try {
    const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM staff WHERE role = 'manager' AND is_active = 1");
    console.log(`RMS — create a manager in "${db}" (active managers now: ${n})\n`);
    if (Number(n) > 0 && !args.includes("--another")) {
      console.log("STOP  This database already has a manager. Nothing was changed.");
      console.log("      Add more staff in Manage → Staff, or run again with --another.");
      process.exitCode = 2;
      return;
    }

    const firstName = await askValid("First name: ", RULES.name);
    const lastName = await askValid("Last name:  ", RULES.name);
    let username;
    for (;;) {
      username = await askValid("Username:   ", RULES.username);
      const [[u]] = await conn.query("SELECT COUNT(*) AS n FROM staff WHERE username = ?", [username]);
      if (Number(u.n) === 0) break;
      console.log("   → this username is already used");
    }
    const phone = await askValid("Phone:      ", RULES.phone);
    let password;
    for (;;) {
      password = await askHidden("Password (at least 10 characters, letters and digits): ");
      const problem = passwordProblem(password);
      if (problem) { console.log(`   → ${problem}`); continue; }
      const again = await askHidden("Password again: ");
      if (again === password) break;
      console.log("   → the two passwords are not the same");
    }

    const hash = await bcrypt.hash(password, 10); // same cost as the app (app/api/staff)
    const [rows] = await conn.query("CALL add_staff(?, ?, ?, ?, ?, ?)", [firstName, lastName, username, hash, "manager", phone]);
    const id = rows?.[0]?.[0]?.staff_id;
    console.log(`\nOK  Manager "${username}" created (staff id ${id}) in "${db}".`);
    console.log("    Log in with this username and password. Keep the password safe; it is not stored anywhere in plain text.");
  } finally {
    await conn.end();
  }
}

main()
  .catch((e) => {
    console.error(`\nERROR  ${e.code === "ER_ACCESS_DENIED_ERROR" || e.code === "ER_DBACCESS_DENIED_ERROR"
      ? `the app user may not use this database (${e.message}). Was it made with npm run db:setup-prod?`
      : e.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
