// =====================================================================
// RMS — licence and first-run setup test (Round 9).   npm run test:licence
//
// Needs: a finished `npm run build`, the database running, rms_test with its
// sample data. Do NOT start RMS yourself: this test starts its own RMS
// server(s) on port 3100 with the licence check switched ON, a throwaway test
// key (made fresh for every run, never stored) and a temporary data folder.
// It never touches your real licence, your .env.local or rms_dev / rms_prod.
//
//   node tests/licence/licence-test.mjs                 code format + licence states
//   node tests/licence/licence-test.mjs --setup-db X    also first-run setup on the
//                                                       EMPTY database X (no manager)
// =====================================================================
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  dayNumber, dayToIso, formatMachineCode, machineBytes, makeActivationCode, parseMachineCode,
  publicKeyFromBase64, rawKeys, readActivationCode, todayIso,
} from "../../lib/licence/format.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = "DevOnly@123"; // rms_test sample password (decision D11)
const args = process.argv.slice(2);
const setupDb = (() => { const i = args.indexOf("--setup-db"); return i >= 0 ? args[i + 1] : null; })();
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${String(detail).slice(0, 160)}` : ""}`);
  return ok;
};
const day = (n) => dayToIso(dayNumber(todayIso()) + n);

// fresh test key — the server gets only the PUBLIC part
const keys = generateKeyPairSync("ed25519");
const testPublic = rawKeys(keys).publicRaw.toString("base64");
const otherKeys = generateKeyPairSync("ed25519");
const DATA = mkdtempSync(join(tmpdir(), "rms-licence-test-"));
const LIC_DIR = join(DATA, "licence");
const code = (machine, number, expires, issued = todayIso(), key = keys.privateKey) =>
  makeActivationCode({ privateKey: key, machine, number, issued, expires });

// ---------- server ----------
let server = null;
async function startServer(db = "rms_test") {
  await stopServer();
  const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: ROOT,
    env: {
      ...process.env, NODE_ENV: "production", DB_NAME: db, RMS_DATA_DIR: DATA,
      RMS_LICENCE: "required", RMS_LICENCE_TEST_PUBLIC_KEY: testPublic, BACKUP_SCHEDULER: "off",
    },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", () => {});
  for (let i = 0; i < 60; i++) {
    try { await fetch(`${BASE}/api/licence`); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  throw new Error("The test server did not start (is `npm run build` done?)");
}
async function stopServer() {
  if (!server) return;
  const s = server; server = null;
  const done = new Promise((r) => s.once("exit", r));
  s.kill();
  await Promise.race([done, new Promise((r) => setTimeout(r, 5000))]);
}

// ---------- http ----------
let cookie = "";
async function call(method, path, body) {
  const headers = cookie ? { cookie } : {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const r = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: r.status, json, text, location: r.headers.get("location") || "" };
}
async function login(username = "manager1", password = PASSWORD) {
  cookie = "";
  const r = await fetch(`${BASE}/api/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
  const c = (r.headers.getSetCookie?.() || []).find((x) => x.startsWith("token="));
  if (c) cookie = c.split(";")[0];
  return r.status;
}
const newOrder = () => call("POST", "/api/orders", { table_id: 1, notes: "licence test", items: [{ menu_item_id: 7, qty: 1 }] });

// ---------- A. code format (no server) ----------
function formatTests() {
  console.log("\n== A. Code format");
  const m = machineBytes("test-machine-id");
  const mc = formatMachineCode(m);
  check("machine code has the form XXXX-XXXX-XXXX-XXXX-X", /^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}-[0-9A-Z]$/.test(mc), mc);
  check("machine code: a typing mistake is detected", parseMachineCode(mc.replace(/^./, (c) => (c === "A" ? "B" : "A"))) === null);
  const pub = publicKeyFromBase64(testPublic);
  const c = code(m, 7, day(365));
  const r = readActivationCode(c, { publicKey: pub, machine: m });
  check("valid code is read back (number and dates)", r.ok && r.licence.number === 7 && r.licence.expires === day(365), JSON.stringify(r));
  check("lower case, spaces instead of dashes: still accepted", readActivationCode(c.toLowerCase().replace(/-/g, " "), { publicKey: pub, machine: m }).ok);
  check("code for another machine is refused", readActivationCode(c, { publicKey: pub, machine: machineBytes("other") }).reason === "signature");
  check("code made with another key is refused", readActivationCode(code(m, 7, day(365), todayIso(), otherKeys.privateKey), { publicKey: pub, machine: m }).reason === "signature");
  const chars = c.split(""); chars[40] = chars[40] === "A" ? "B" : "A";
  check("one changed character is refused", !readActivationCode(chars.join(""), { publicKey: pub, machine: m }).ok);
  check("incomplete code is refused", readActivationCode(c.slice(0, -10), { publicKey: pub, machine: m }).reason === "format");
}

// ---------- B. licence states (server, rms_test) ----------
async function stateTests() {
  console.log("\n== B. Licence states (test server with the licence check ON)");
  await startServer();
  let r = await call("GET", "/api/licence");
  const machine = parseMachineCode(r.json?.machineCode);
  check("no licence: state 'missing', blocked", r.json?.enforced && r.json?.state === "missing" && r.json?.blocked, JSON.stringify(r.json));
  check("no licence: the machine code is shown", !!machine, r.json?.machineCode);
  check("no licence: owner contact is shown", !!r.json?.contact?.whatsapp, JSON.stringify(r.json?.contact));
  r = await call("GET", "/login");
  check("no licence: /login goes to /licence", r.status === 307 && r.location.endsWith("/licence"), `${r.status} ${r.location}`);
  r = await call("GET", "/main/orders");
  check("no licence: /main/orders goes to /licence", r.status === 307 && r.location.endsWith("/licence"), `${r.status} ${r.location}`);
  r = await call("POST", "/api/login", { username: "manager1", password: PASSWORD });
  check("no licence: login refused (403)", r.status === 403 && r.json?.error === "Licence required", r.text);
  r = await call("GET", "/api/menu");
  check("no licence: menu API refused too (403)", r.status === 403, r.text);
  r = await call("GET", "/licence");
  check("no licence: licence page opens", r.status === 200, r.status);

  r = await call("POST", "/api/licence", { code: "not a code" });
  check("activation: garbage refused", r.status === 400 && /not recognised/.test(r.json?.error || ""), r.text);
  r = await call("POST", "/api/licence", { code: code(machineBytes("other"), 1, day(365)) });
  check("activation: code for another computer refused", r.status === 400 && /not for this computer/.test(r.json?.error || ""), r.text);
  r = await call("POST", "/api/licence", { code: code(machine, 1, day(365), todayIso(), otherKeys.privateKey) });
  check("activation: code from another key refused", r.status === 400 && /not for this computer/.test(r.json?.error || ""), r.text);
  r = await call("POST", "/api/licence", { code: code(machine, 1, day(-1), day(-30)) });
  check("activation: already expired code refused", r.status === 400 && /expired/.test(r.json?.error || ""), r.text);

  r = await call("POST", "/api/licence", { code: code(machine, 2, day(20)) });
  check("activation: 20-day code accepted → 'expiring', 20 days left", r.status === 200 && r.json?.state === "expiring" && r.json?.daysLeft === 20, r.text);
  check("after activation: login works", (await login()) === 200);
  r = await newOrder();
  check("last 30 days: new orders still work (only a reminder)", r.status === 200, r.text);
  if (r.json?.orderId) await call("DELETE", `/api/orders/${r.json.orderId}`);
  r = await call("POST", "/api/licence", { code: code(machine, 3, day(10)) });
  check("activation: a code ending EARLIER is refused", r.status === 400 && /earlier/.test(r.json?.error || ""), r.text);
  r = await call("POST", "/api/licence", { code: code(machine, 4, day(385)) });
  check("renewal: a longer code is accepted → 'valid'", r.status === 200 && r.json?.state === "valid" && r.json?.expires === day(385), r.text);

  // expired licence (written directly, as it would be after a year)
  writeFileSync(join(LIC_DIR, "licence.txt"), code(machine, 5, day(-1), day(-366)) + "\n");
  await startServer();
  r = await call("GET", "/api/licence");
  check("expired: state 'expired', read-only, not blocked", r.json?.state === "expired" && r.json?.readOnly && !r.json?.blocked, JSON.stringify(r.json));
  check("expired: login still works", (await login()) === 200);
  r = await call("GET", "/api/orders");
  check("expired: orders can still be looked at", r.status === 200, r.status);
  r = await newOrder();
  check("expired: new order refused (read-only)", r.status === 403 && /read-only/.test(r.json?.error || ""), r.text);
  r = await call("PATCH", "/api/menu/1", { is_active: false });
  check("expired: menu change refused (route outside the proxy too)", r.status === 403 && /read-only/.test(r.json?.error || ""), r.text);
  r = await call("POST", "/api/reports", { reportType: "sales", startDate: todayIso(), endDate: todayIso() });
  check("expired: reports still work", r.status === 200, r.status);
  r = await call("POST", "/api/licence", { code: code(machine, 6, day(365)) });
  check("expired: new code accepted", r.status === 200 && r.json?.state === "valid", r.text);
  r = await newOrder();
  check("after renewal: new orders work again at once", r.status === 200, r.text);
  if (r.json?.orderId) await call("DELETE", `/api/orders/${r.json.orderId}`);

  // computer clock set back: RMS has already seen a later date
  writeFileSync(join(LIC_DIR, "last-seen.txt"), String(Date.now() + 3 * 86400000));
  await startServer();
  r = await call("GET", "/api/licence");
  check("clock set back: state 'clock', read-only", r.json?.state === "clock" && r.json?.readOnly, JSON.stringify(r.json));
  await login();
  r = await newOrder();
  check("clock set back: new order refused", r.status === 403, r.text);
  r = await call("POST", "/api/licence", { code: code(machine, 7, day(30)) });
  check("clock set back: an older code still cannot shorten the licence", r.status === 400 && /earlier/.test(r.json?.error || ""), r.text);
  rmSync(join(LIC_DIR, "last-seen.txt"), { force: true });

  // licence file changed by hand
  const saved = readFileSync(join(LIC_DIR, "licence.txt"), "utf8").trim();
  const t = saved.split(""); t[60] = t[60] === "A" ? "B" : "A";
  writeFileSync(join(LIC_DIR, "licence.txt"), t.join("") + "\n");
  await startServer();
  r = await call("GET", "/api/licence");
  check("licence file changed by hand: 'invalid', blocked", r.json?.state === "invalid" && r.json?.blocked, JSON.stringify(r.json));
  writeFileSync(join(LIC_DIR, "licence.txt"), saved + "\n");
  return machine;
}

// ---------- C. first-run setup (optional, empty database) ----------
async function setupTests(machine) {
  console.log(`\n== C. First-run setup on the empty database "${setupDb}"`);
  await startServer(setupDb);
  cookie = "";
  let r = await call("GET", "/login");
  check("no manager yet: /login goes to /setup", r.status === 307 && r.location.endsWith("/setup"), `${r.status} ${r.location}`);
  r = await call("GET", "/api/setup");
  check("setup needed", r.json?.needed === true, r.text);
  const codeFile = join(LIC_DIR, "setup-code.txt");
  const setupCode = existsSync(codeFile) ? readFileSync(codeFile, "utf8").trim() : "";
  check("setup code written to the licence folder", /^[0-9A-Z]{5}-[0-9A-Z]{5}$/.test(setupCode), setupCode);
  const person = { firstName: "Owner", lastName: "Test", username: "owner_setup", phone: "0700000088", password: "FirstRun2026x" };
  r = await call("POST", "/api/setup", { ...person, code: "WRONG-CODE0" });
  check("wrong setup code refused (403)", r.status === 403, r.text);
  r = await call("POST", "/api/setup", { ...person, code: setupCode, password: "short1" });
  check("weak password refused (400)", r.status === 400, r.text);
  r = await call("POST", "/api/setup", { ...person, code: setupCode.toLowerCase() });
  check("first manager created", r.status === 200 && r.json?.success, r.text);
  check("setup code deleted afterwards", !existsSync(codeFile));
  r = await call("POST", "/api/setup", { ...person, username: "second_owner", code: setupCode });
  check("setup cannot run a second time (409)", r.status === 409, r.text);
  r = await call("GET", "/api/setup");
  check("setup no longer needed", r.json?.needed === false, r.text);
  check("new manager can log in", (await login(person.username, person.password)) === 200);
  r = await call("GET", "/login");
  check("/login no longer goes to /setup", !(r.status === 307 && r.location.endsWith("/setup")), `${r.status} ${r.location}`);
  void machine;
}

async function main() {
  console.log(`RMS licence test — temporary data folder ${DATA}`);
  formatTests();
  const machine = await stateTests();
  if (setupDb) await setupTests(machine);
  await stopServer();
  const fails = results.filter((x) => !x).length;
  console.log(`\nSUMMARY  PASS=${results.length - fails}  FAIL=${fails}  TOTAL=${results.length}`);
  process.exitCode = fails ? 1 : 0;
}

main()
  .catch(async (e) => {
    console.error("LICENCE TEST ABORTED:", e.message);
    process.exitCode = 2;
  })
  .finally(async () => {
    await stopServer();
    rmSync(DATA, { recursive: true, force: true });
  });
