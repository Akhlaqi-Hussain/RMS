// =====================================================================
// RMS — API regression test (Gate 5).  Node.js 18+ only, no packages needed.
// Run it while the app is running against the TEST database (rms_test):
//     npm run test:api                       (from the project folder), or
//     node tests/api/rms-api-test.mjs http://localhost:3000 .
// Safe to run many times: it creates its own uniquely named test records
// and never touches the seed records except reading them.
// Prints PASS / FAIL / KNOWN for every check and a summary at the end.
//   KNOWN = an already-reported issue (e.g. BUG-3) behaving as documented;
//           it is NOT counted as a pass.
// Version 2 (after SEC-1/SEC-2/SEC-3): checks login/role protection of the API
// and server-side image validation.
// Version 3 (round 2): SEC-6 active-account check, SEC-5 order access,
// SEC-7 friendly errors, BUG-2 connection leak, BUG-12 upload route safety.
// Version 4 (cleanup round): HOME-1 "/" goes to /login, BUG-3 add-table
// response, empty table number, BUG-9 category errors, BUG-7 cashier pages.
// Version 5 (round 4): BUG-4 orders are saved all-or-nothing (transactions).
// Version 6: BACKUP-2 backup status API (manager only, read-only).
// Version 7: BACKUP-3 Manage → Backups (backup now, schedule, download).
//   Makes one small "manual" backup of the database the app uses (rms_test).
// Version 8 (round 7, security batch S1): S1-LOGIN one message + pause after
//   10 failures, S1-HDR headers, S1-ROLE current role, S1-ORD own orders only,
//   S1-VAL staff checks, S1-MGR keep one active manager.
//   The S1-XSS print check needs a browser: see docs/TEST-CHECKLIST.md.
// =====================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const REPO = process.argv[3] || ".";
const PASSWORD = "DevOnly@123"; // dev/test-only seed password (decision D11)
const RUN = String(Date.now()).slice(-6); // makes names unique per run
const results = [];

function record(status, name, detail = "") {
  results.push({ status, name, detail });
  const d = detail ? ` :: ${String(detail).slice(0, 160)}` : "";
  console.log(`${status.padEnd(5)} ${name}${d}`);
}
function check(name, ok, detail) { record(ok ? "PASS" : "FAIL", name, detail); return ok; }

const jars = {};
async function call(who, method, path, body, { form, timeoutMs = 180000 } = {}) {
  const headers = {};
  if (who && jars[who]) headers.cookie = jars[who];
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: res.status, json, text, headers: res.headers };
}
async function login(user, password = PASSWORD) {
  const r = await call(null, "POST", "/api/login", { username: user, password });
  const cookie = (r.headers.getSetCookie?.() || []).find((c) => c.startsWith("token="));
  if (cookie) jars[user] = cookie.split(";")[0];
  return r;
}
const today = () => {
  const d = new Date(Date.now() + 4.5 * 3600 * 1000); // Kabul date (UTC+04:30)
  return d.toISOString().slice(0, 10);
};

async function main() {
  console.log(`RMS API test — ${BASE} — run ${RUN}\n`);

  // ---------- 1. Authentication ----------
  for (const u of ["manager1", "cashier1", "waiter1", "chef1"]) {
    const r = await login(u);
    check(`AUTH login ${u}`, r.status === 200 && r.json?.success === true && !!jars[u], r.text);
  }
  let r = await call(null, "POST", "/api/login", { username: "manager1", password: "wrong-pass" });
  check("AUTH wrong password rejected (401)", r.status === 401, r.text);
  const wrongPwText = r.json?.message;
  await login("manager1"); // S1-LOGIN: a good login clears the failure count (repeated runs never pause manager1)
  r = await call(null, "POST", "/api/login", { username: `nobody_${RUN}`, password: "whatever1" });
  check("AUTH unknown user rejected (401)", r.status === 401, r.text);
  check("S1-LOGIN unknown user and wrong password give the same message", !!wrongPwText && r.json?.message === wrongPwText, `${wrongPwText} | ${r.json?.message}`);
  r = await call("manager1", "GET", "/api/auth");
  check("AUTH /api/auth returns role", r.status === 200 && r.json?.role === "manager", r.text);
  r = await call(null, "GET", "/api/auth");
  check("AUTH /api/auth without login → 401", r.status === 401, r.text);

  // Page protection (middleware)
  r = await call(null, "GET", "/main");
  check("PAGES /main without login redirects to /login", r.status === 307 && (r.headers.get("location") || "").includes("/login"), r.headers.get("location"));
  r = await call("waiter1", "GET", "/main/manage");
  check("PAGES waiter blocked from /main/manage", r.status === 307 && (r.headers.get("location") || "").includes("/main/orders"), r.headers.get("location"));
  r = await call("manager1", "GET", "/main/manage");
  check("PAGES manager can open /main/manage", r.status === 200, r.status);
  r = await call(null, "GET", "/");
  check("HOME-1 / redirects to /login", [307, 308].includes(r.status) && (r.headers.get("location") || "").includes("/login"), `${r.status} ${r.headers.get("location")}`);
  r = await call(null, "GET", "/api/backups/status");
  check("BACKUP-2 status without login → 401", r.status === 401, r.status);
  r = await call("waiter1", "GET", "/api/backups/status");
  check("BACKUP-2 status for waiter → 403", r.status === 403, r.status);
  r = await call("manager1", "GET", "/api/backups/status");
  check("BACKUP-2 manager sees backup status", r.status === 200 && typeof r.json?.stale === "boolean" && Number.isInteger(r.json?.count), r.text);
  r = await call("cashier1", "GET", "/api/backups");
  check("BACKUP-3 cashier cannot open backups (403)", r.status === 403, r.status);
  r = await call("manager1", "GET", "/api/backups");
  const savedSettings = r.json?.settings;
  check("BACKUP-3 manager sees backups and schedule", r.status === 200 && Array.isArray(r.json?.backups) && !!savedSettings, r.text);
  r = await call("manager1", "PUT", "/api/backups/settings", { enabled: true, frequency: "hourly", time: "25:99", weekday: 9 });
  check("BACKUP-3 invalid schedule rejected (400)", r.status === 400, r.text);
  r = await call("manager1", "PUT", "/api/backups/settings", { enabled: true, frequency: "weekly", time: "22:15", weekday: 5 });
  check("BACKUP-3 schedule saved (weekly, Friday 22:15)", r.status === 200 && r.json?.settings?.frequency === "weekly" && r.json?.settings?.time === "22:15", r.text);
  if (savedSettings) await call("manager1", "PUT", "/api/backups/settings", savedSettings); // put the user's schedule back
  r = await call("waiter1", "POST", "/api/backups");
  check("BACKUP-3 waiter cannot start a backup (403)", r.status === 403, r.status);
  r = await call("manager1", "POST", "/api/backups", undefined, { timeoutMs: 300000 });
  const newBackup = r.json?.name;
  check("BACKUP-3 'Back up now' creates a checked backup", r.status === 200 && /^rms-backup_.+_manual\.tar\.gz$/.test(newBackup || ""), r.text);
  if (newBackup) {
    const res = await fetch(`${BASE}/api/backups/download?name=${encodeURIComponent(newBackup)}`, { headers: { cookie: jars.manager1 }, redirect: "manual" });
    const buf = Buffer.from(await res.arrayBuffer());
    check("BACKUP-3 backup can be downloaded (gzip file)", res.status === 200 && buf.length > 1000 && buf[0] === 0x1f && buf[1] === 0x8b, `${res.status} ${buf.length} bytes`);
  }
  r = await call("manager1", "GET", "/api/backups/download?name=..%2F..%2Fproject%2F.env.local");
  check("BACKUP-3 download refuses other files (404)", r.status === 404, r.status);
  r = await call("cashier1", "GET", "/main/dashboard");
  check("BUG-7 cashier sent away from /main/dashboard", r.status === 307 && (r.headers.get("location") || "").includes("/main/orders"), r.headers.get("location"));

  // SEC-1: API routes require login; management APIs require the manager role
  const anon = [
    ["GET", "/api/staff"], ["POST", "/api/staff", {}], ["GET", "/api/tables"], ["POST", "/api/tables", { table_no: "x" }],
    ["GET", "/api/menu"], ["GET", "/api/categories"], ["POST", "/api/categories", { name: "x" }],
    ["GET", "/api/orders"], ["GET", "/api/orders/by-table?table_id=1"], ["GET", "/api/dashboard"],
    ["POST", "/api/reports", { reportType: "sales", startDate: "2026-01-01", endDate: "2026-01-02" }],
  ];
  for (const [m, p, b] of anon) {
    r = await call(null, m, p, b);
    check(`SEC-1 ${m} ${p.split("?")[0]} without login → 401`, r.status === 401, `status ${r.status}`);
  }
  const roleChecks = [
    ["waiter1", "GET", "/api/staff", undefined, 403],
    ["cashier1", "GET", "/api/dashboard", undefined, 403],
    ["chef1", "POST", "/api/reports", { reportType: "sales", startDate: "2026-01-01", endDate: "2026-01-02" }, 403],
    ["waiter1", "POST", "/api/tables", { table_no: "zz" }, 403],
    ["chef1", "PATCH", "/api/menu/1", { is_active: false }, 403],
    ["cashier1", "POST", "/api/categories", { name: "zz" }, 403],
    ["waiter1", "GET", "/api/menu", undefined, 200],
    ["waiter1", "GET", "/api/tables", undefined, 200],
    ["chef1", "GET", "/api/categories", undefined, 200],
  ];
  for (const [who, m, p, b, exp] of roleChecks) {
    r = await call(who, m, p, b);
    check(`SEC-1 ${who} ${m} ${p} → ${exp}`, r.status === exp, `status ${r.status}`);
  }

  // ---------- 2. Reference data ----------
  r = await call("manager1", "GET", "/api/categories");
  check("CATEGORY list", r.status === 200 && Array.isArray(r.json) && r.json.length >= 3, r.text);
  const catName = `دسته-${RUN}`;
  r = await call("manager1", "POST", "/api/categories", { name: catName });
  check("CATEGORY add", r.status === 200 && r.json?.name === catName, r.text);
  const newCatId = r.json?.id;
  r = await call("manager1", "POST", "/api/categories", { name: catName });
  check("BUG-9 duplicate category rejected with a reason (400)", r.status === 400 && !!r.json?.error, r.text);
  r = await call("manager1", "POST", "/api/categories", { name: "  " });
  check("BUG-9 empty category name rejected (400)", r.status === 400 && !!r.json?.error, r.text);

  r = await call("manager1", "GET", "/api/menu");
  const menu = Array.isArray(r.json) ? r.json : [];
  check("MENU list all", r.status === 200 && menu.length >= 8, `${menu.length} items`);
  check("MENU price is a number", typeof menu[0]?.price === "number", JSON.stringify(menu[0]));
  check("MENU image is a web path", menu.every((m) => m.image === null || m.image.startsWith("/uploads/menu/")), menu[0]?.image);
  r = await call("manager1", "GET", "/api/menu?categoryId=2");
  check("MENU filter by category", r.status === 200 && r.json.length > 0 && r.json.every((m) => m.category === 2), `${r.json?.length} items`);
  const priceOf = Object.fromEntries(menu.map((m) => [m.id, m.price]));

  r = await call("manager1", "GET", "/api/tables");
  check("TABLE list", r.status === 200 && Array.isArray(r.json) && r.json.length >= 5, `${r.json?.length} tables`);

  const tno = `T${RUN}`;
  r = await call("manager1", "POST", "/api/tables", { table_no: tno });
  const newTableId = r.json?.table_id;
  check("TABLE add", r.status === 200 && Number.isInteger(newTableId), r.text);
  check("BUG-3 add-table response includes table_no and is_active", r.json?.table_no === tno && r.json?.is_active !== undefined, r.text);
  r = await call("manager1", "POST", "/api/tables", { table_no: "   " });
  check("TABLE empty number rejected (400)", r.status === 400, r.text);
  r = await call("manager1", "POST", "/api/tables", { table_no: tno });
  check("TABLE duplicate number rejected (400)", r.status === 400, r.text);
  r = await call("manager1", "PUT", `/api/tables/${newTableId}`, { table_no: `${tno}b` });
  check("TABLE edit", r.status === 200, r.text);
  r = await call("manager1", "PATCH", `/api/tables/${newTableId}`, { is_active: false });
  check("TABLE deactivate", r.status === 200 && r.json?.is_active === false, r.text);
  r = await call("manager1", "GET", `/api/tables/${newTableId}`);
  check("TABLE read back (edited + inactive)", r.status === 200 && r.json?.table_no === `${tno}b` && r.json?.is_active === 0, r.text);
  r = await call("manager1", "DELETE", `/api/tables/${newTableId}`);
  check("TABLE delete (never used)", r.status === 200, r.text);

  // ---------- 3. Staff ----------
  r = await call("manager1", "GET", "/api/staff");
  check("STAFF list", r.status === 200 && r.json?.some((s) => s.username === "manager1"), `${r.json?.length} staff`);
  check("STAFF list hides passwords", !r.text.includes("$2b$"), "");
  const uname = `waiter_${RUN}`;
  const newStaff = { firstName: "Test", lastName: "Waiter", username: uname, password: PASSWORD, role: "waiter", phone: "0700000099" };
  r = await call("manager1", "POST", "/api/staff", newStaff);
  const staffId = r.json?.staff_id;
  check("STAFF add", r.status === 200 && Number.isInteger(staffId), r.text);
  r = await call("manager1", "POST", "/api/staff", newStaff);
  check("STAFF duplicate username rejected", r.status >= 400 && /نام کاربری/.test(r.text), r.text);
  r = await call("manager1", "GET", `/api/staff/${staffId}`);
  check("STAFF get by id (no password returned)", r.status === 200 && r.json?.username === uname && !("password" in r.json), r.text);
  const edit = { firstName: "Edited", lastName: "Waiter", role: "waiter", phone: "0700000098", username: uname };
  r = await call("manager1", "PUT", `/api/staff/${staffId}`, edit);
  check("STAFF edit", r.status === 200 && r.json?.staff?.name === "Edited", r.text);
  r = await call("manager1", "PUT", `/api/staff/${staffId}`, { ...edit, username: "chef1" });
  check("STAFF edit to taken username rejected (400)", r.status === 400, r.text);
  r = await call("manager1", "PUT", `/api/staff/${staffId}`, { ...edit, password: "NewPass@1" });
  check("STAFF change password", r.status === 200, r.text);
  r = await login(uname, "NewPass@1");
  check("STAFF login with new password", r.status === 200, r.text);

  // SEC-6: the CURRENT role and active status from the database are used on every request
  r = await call(uname, "GET", "/api/staff");
  check("SEC-6 waiter token cannot read staff (403)", r.status === 403, `status ${r.status}`);
  r = await call("manager1", "PUT", `/api/staff/${staffId}`, { ...edit, role: "manager" });
  r = await call(uname, "GET", "/api/staff");
  check("SEC-6 promotion to manager applies immediately (same token → 200)", r.status === 200, `status ${r.status}`);
  r = await call("manager1", "PUT", `/api/staff/${staffId}`, { ...edit, role: "waiter" });
  r = await call(uname, "GET", "/api/staff");
  check("SEC-6 demotion applies immediately (same token → 403)", r.status === 403, `status ${r.status}`);
  r = await call("waiter1", "GET", `/api/staff/${staffId}`);
  check("STAFF waiter cannot read staff details (403)", r.status === 403, r.text);
  r = await call("manager1", "PATCH", `/api/staff/${staffId}`, { is_active: false });
  check("STAFF deactivate", r.status === 200, r.text);
  r = await login(uname, "NewPass@1");
  check("STAFF deactivated user cannot log in (D5)", r.status === 401, r.text);
  r = await call(uname, "GET", "/api/orders");
  check("SEC-6 deactivated user's existing login is refused at once (401)", r.status === 401, `status ${r.status}`);
  r = await call(uname, "GET", "/main/orders");
  check("SEC-6 deactivated user is sent back to /login", r.status === 307 && (r.headers.get("location") || "").includes("/login"), r.headers.get("location"));
  r = await call(uname, "GET", "/api/menu");
  check("SEC-6 deactivated user refused on menu route too (401)", r.status === 401, `status ${r.status}`);
  r = await call(null, "GET", "/api/menu/1");
  check("SEC-1 GET /api/menu/1 without login → 401", r.status === 401, `status ${r.status}`);
  r = await call("waiter1", "GET", "/api/menu/1");
  check("SEC-1 waiter can read a single menu item (200)", r.status === 200, `status ${r.status}`);
  r = await call("cashier1", "DELETE", "/api/menu/1");
  check("SEC-1 cashier cannot delete menu items (403)", r.status === 403, `status ${r.status}`);

  // ---------- 4. Menu management (multipart + image) ----------
  const imgPath = join(REPO, "public", "uploads", "menu", "1757920315662-berry.jpg");
  const imgBuf = readFileSync(imgPath);
  const form = new FormData();
  form.append("name", `آزمایش-${RUN}`);
  form.append("description", "آیتم آزمایشی موقت");
  form.append("category", String(newCatId));
  form.append("price", "200");
  form.append("image", new Blob([imgBuf], { type: "image/jpeg" }), "test-image.jpg");
  r = await call("manager1", "POST", "/api/menu", undefined, { form });
  const itemId = r.json?.id;
  check("MENU add with image", r.status === 200 && Number.isInteger(itemId), r.text);
  const form2 = new FormData();
  form2.append("name", `آزمایش-${RUN}-ویرایش`);
  form2.append("description", "توضیح جدید");
  form2.append("category", String(newCatId));
  form2.append("price", "250");
  r = await call("manager1", "PUT", `/api/menu/${itemId}`, undefined, { form: form2 });
  check("MENU edit (keep image)", r.status === 200, r.text);
  r = await call("manager1", "GET", `/api/menu?categoryId=${newCatId}`);
  const edited = r.json?.find((m) => m.id === itemId);
  check("MENU read back edit", edited?.price === 250 && typeof edited?.image === "string", JSON.stringify(edited));
  check("SEC-2 stored image gets a safe generated name", /^\/uploads\/menu\/\d+-[0-9a-f]{12}\.jpg$/.test(edited?.image || ""), edited?.image);
  const imgRes = edited?.image ? await fetch(BASE + edited.image) : null;
  check("MENU uploaded image is served", imgRes?.status === 200, imgRes?.status);
  // SEC-2: the server rejects files that are not real images, and oversized files
  const fakeForm = (bytes, name, type) => {
    const f = new FormData();
    f.append("name", `جعلی-${RUN}-${name.length}`);
    f.append("description", "فایل آزمایشی نامعتبر");
    f.append("category", String(newCatId));
    f.append("price", "100");
    f.append("image", new Blob([bytes], { type }), name);
    return f;
  };
  r = await call("manager1", "POST", "/api/menu", undefined, { form: fakeForm(Buffer.from("<html><script>alert(1)</script></html>"), "evil.jpg", "image/jpeg") });
  check("SEC-2 HTML disguised as .jpg rejected (400)", r.status === 400, r.text);
  const large = Buffer.alloc(Math.round(4.9 * 1024 * 1024)); large[0] = 0xff; large[1] = 0xd8; large[2] = 0xff;
  r = await call("manager1", "POST", "/api/menu", undefined, { form: fakeForm(large, "large-photo.jpg", "image/jpeg") });
  check("SEC-2 valid 4.9 MB picture accepted (large phone photos work)", r.status === 200 && Number.isInteger(r.json?.id), `status ${r.status} ${r.text.slice(0, 80)}`);
  if (r.json?.id) await call("manager1", "DELETE", `/api/menu/${r.json.id}`);
  const big = Buffer.alloc(5 * 1024 * 1024 + 10); big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff;
  r = await call("manager1", "POST", "/api/menu", undefined, { form: fakeForm(big, "big.jpg", "image/jpeg") });
  check("SEC-2 image over 5 MB rejected (400)", r.status === 400, r.text);
  r = await call("manager1", "PUT", `/api/menu/${itemId}`, undefined, { form: fakeForm(Buffer.from("not an image"), "x.png", "image/png") });
  check("SEC-2 invalid image on edit rejected (400)", r.status === 400, r.text);
  r = await call("manager1", "POST", "/api/menu", undefined, { form: fakeForm(imgBuf, "../../../evil.jpg", "image/jpeg") });
  const travId = r.json?.id;
  const r2 = await call("manager1", "GET", `/api/menu?categoryId=${newCatId}`);
  const trav = r2.json?.find((m) => m.id === travId);
  check("SEC-2 path-trick file name ignored (safe name used)", !!trav && !trav.image.includes("..") && /^\/uploads\/menu\/\d+-[0-9a-f]{12}\.jpg$/.test(trav.image), trav?.image);
  if (travId) await call("manager1", "DELETE", `/api/menu/${travId}`);

  r = await call("manager1", "PATCH", `/api/menu/${itemId}`, { is_active: false });
  check("MENU deactivate", r.status === 200, r.text);
  r = await call("manager1", "DELETE", `/api/menu/${itemId}`);
  check("MENU delete (never ordered; image file removed)", r.status === 200, r.text);

  // ---------- 5. Orders ----------
  const t1 = 1, t2 = 2; // seed tables
  r = await call("waiter1", "POST", "/api/orders", {
    table_id: t1, notes: "بدون پیاز",
    items: [{ menu_item_id: 2, qty: 2, price: 1 }, { menu_item_id: 5, qty: 1, price: priceOf[5] }],
  });
  const orderA = r.json?.orderId;
  check("ORDER create (with tampered price 1)", r.status === 200 && Number.isInteger(orderA), r.text);
  r = await call("waiter1", "POST", "/api/orders", { table_id: t2, items: [{ menu_item_id: 3, qty: 1, price: priceOf[3] }] });
  const orderB = r.json?.orderId;
  check("ORDER create second order", r.status === 200 && Number.isInteger(orderB), r.text);
  r = await call("waiter1", "GET", `/api/orders/by-table?table_id=${t1}`);
  check("ORDER open orders by table", r.status === 200 && r.json?.some((o) => o.order_id === orderA), r.text);
  r = await call("waiter1", "POST", `/api/orders/${orderA}`, { orderId: orderA, items: [{ menu_item_id: 7, qty: 2, price: priceOf[7] }] });
  check("ORDER add items to existing order", r.status === 200, r.text);
  // BUG-4: one bad item must undo the whole request
  r = await call("manager1", "GET", "/api/orders");
  const ordersBefore = Array.isArray(r.json) ? r.json.length : -1;
  r = await call("waiter1", "POST", "/api/orders", { table_id: t2, items: [{ menu_item_id: 3, qty: 1, price: 0 }, { menu_item_id: 999999, qty: 1, price: 0 }] });
  check("BUG-4 order with an unknown item is refused (400)", r.status === 400, r.text);
  r = await call("manager1", "GET", "/api/orders");
  check("BUG-4 refused order left nothing behind", Array.isArray(r.json) && r.json.length === ordersBefore, `${ordersBefore} → ${r.json?.length}`);
  r = await call("waiter1", "POST", `/api/orders/${orderA}`, { orderId: orderA, items: [{ menu_item_id: 8, qty: 1, price: 0 }, { menu_item_id: 999999, qty: 1, price: 0 }] });
  check("BUG-4 adding an unknown item is refused (400)", r.status === 400, r.text);
  r = await call("waiter1", "GET", `/api/orders/${orderA}`);
  const items = r.json?.items || [];
  check("ORDER details: header", r.status === 200 && r.json?.order?.order_id === orderA && r.json?.order?.note === "بدون پیاز", JSON.stringify(r.json?.order));
  check("ORDER details: 3 items", items.length === 3, `${items.length}`);
  const kebab = items.find((i) => i.menu_item_id === 2);
  check("ORDER price comes from database, not browser (D3)", kebab?.price === priceOf[2] && kebab?.total_price === 2 * priceOf[2], JSON.stringify(kebab));
  r = await call("waiter1", "GET", "/api/orders");
  check("ORDER list: waiter sees own orders", r.status === 200 && r.json?.some((o) => o.order_id === orderA) && r.json.every((o) => typeof o.waiter === "string"), `${r.json?.length} orders`);
  r = await call("chef1", "PATCH", `/api/orders/${orderA}`);
  check("KITCHEN pending items → in-progress", r.status === 200 && r.json?.updated_count === 3, r.text);
  r = await call("chef1", "PATCH", `/api/orders/${orderA}`);
  check("KITCHEN second time: nothing pending (404)", r.status === 404, r.text);
  // SEC-5: order access rules (a second waiter + the chef)
  const unameB = `waiterB_${RUN}`;
  r = await call("manager1", "POST", "/api/staff", { firstName: "Second", lastName: "Waiter", username: unameB, password: PASSWORD, role: "waiter", phone: "0700000097" });
  const staffB = r.json?.staff_id;
  await login(unameB);
  r = await call(unameB, "GET", `/api/orders/${orderA}`);
  check("SEC-5 other waiter cannot open someone else's order (403)", r.status === 403, `status ${r.status}`);
  r = await call(unameB, "PATCH", `/api/orders/${orderB}`);
  check("SEC-5 other waiter cannot send someone else's order to kitchen (403)", r.status === 403, `status ${r.status}`);
  r = await call(unameB, "DELETE", `/api/orders/${orderB}`);
  check("SEC-5 other waiter cannot cancel someone else's order (403)", r.status === 403, `status ${r.status}`);
  r = await call("chef1", "DELETE", `/api/orders/${orderB}`);
  check("SEC-5 chef cannot cancel orders (403)", r.status === 403, `status ${r.status}`);
  r = await call("chef1", "GET", `/api/orders/${orderA}`);
  check("SEC-5 chef can still open orders (200)", r.status === 200, `status ${r.status}`);
  r = await call("cashier1", "GET", `/api/orders/${orderA}`);
  check("SEC-5 cashier can still open any order (200)", r.status === 200, `status ${r.status}`);
  r = await call("manager1", "GET", "/api/orders/999999");
  check("SEC-5 unknown order → 404", r.status === 404, `status ${r.status}`);
  if (staffB) await call("manager1", "PATCH", `/api/staff/${staffB}`, { is_active: false });

  r = await call("waiter1", "DELETE", `/api/orders/${orderB}`);
  check("ORDER cancel open order", r.status === 200, r.text);
  r = await call("waiter1", "POST", `/api/orders/${orderB}`, { orderId: orderB, items: [{ menu_item_id: 7, qty: 1, price: priceOf[7] }] });
  check("ORDER cannot add items to cancelled order (D6)", r.status >= 400, r.text);
  check("SEC-7 add-items error gives the friendly reason (400)", r.status === 400 && /سفارش باز یافت نشد/.test(r.json?.error || ""), r.text);

  // BUG-2: many cancellations in a row must not use up the 10 database connections
  let leakOk = true, leakDetail = "";
  try {
    for (let i = 0; i < 12; i++) {
      const c = await call("waiter1", "POST", "/api/orders", { table_id: 3, items: [{ menu_item_id: 5, qty: 1, price: priceOf[5] }] });
      const d = await call("waiter1", "DELETE", `/api/orders/${c.json?.orderId}`, undefined, { timeoutMs: 30000 });
      if (d.status !== 200) { leakOk = false; leakDetail = `cancel #${i + 1}: ${d.status}`; break; }
    }
    const after = await call("waiter1", "GET", "/api/orders", undefined, { timeoutMs: 30000 });
    if (after.status !== 200) { leakOk = false; leakDetail = `list after cancels: ${after.status}`; }
  } catch (e) { leakOk = false; leakDetail = `server stopped answering: ${e.message}`; }
  check("BUG-2 12 cancellations in a row, app still answers", leakOk, leakDetail);

  // ---------- 6. Payment ----------
  const expectedSubtotal = 2 * priceOf[2] + priceOf[5] + 2 * priceOf[7];
  r = await call("cashier1", "GET", "/api/orders");
  check("ORDER list: cashier sees all", r.status === 200 && r.json?.some((o) => o.order_id === orderB), `${r.json?.length} orders`);
  r = await call("waiter1", "POST", `/api/orders/${orderA}/payment`, { order_id: orderA, subtotal: 1, discount: 0 });
  check("PAY waiter forbidden (403)", r.status === 403, r.text);
  r = await call("cashier1", "POST", `/api/orders/${orderA}/payment`, { order_id: orderA, subtotal: expectedSubtotal, discount: expectedSubtotal + 1 });
  check("PAY discount larger than total rejected (D4)", r.status >= 400, r.text);
  check("SEC-7 payment error gives the friendly reason (400)", r.status === 400 && /تخفیف نامعتبر/.test(r.json?.error || ""), r.text);
  r = await call("cashier1", "POST", `/api/orders/${orderA}/payment`, { order_id: orderA, subtotal: 1, discount: 80 });
  const pay = r.json?.payment;
  check("PAY with discount 80 (subtotal recalculated, D4)", r.status === 200 && pay?.subtotal === expectedSubtotal && pay?.discount === 80 && pay?.total_amount === expectedSubtotal - 80, r.text);
  r = await call("cashier1", "POST", `/api/orders/${orderA}/payment`, { order_id: orderA, subtotal: expectedSubtotal, discount: 0 });
  check("PAY same order twice rejected (D4)", r.status >= 400, r.text);
  r = await call("cashier1", "GET", `/api/orders/${orderA}`);
  check("PAY order now closed with bill", r.json?.order?.status === "closed" && r.json?.order?.paid === 1 && r.json?.bill?.total_amount === expectedSubtotal - 80, JSON.stringify(r.json?.bill));
  r = await call("cashier1", "DELETE", `/api/orders/${orderA}`);
  check("ORDER paid order cannot be cancelled (D6)", r.status >= 400, r.text);
  check("SEC-7 cancel error gives the friendly reason (400)", r.status === 400 && /فقط سفارش باز/.test(r.json?.error || ""), r.text);
  r = await call("manager1", "DELETE", `/api/tables/${t1}`);
  check("TABLE with orders cannot be deleted (400)", r.status === 400, r.text);
  r = await call("manager1", "DELETE", "/api/menu/2");
  check("MENU item with orders cannot be deleted (400)", r.status === 400, r.text);

  // ---------- 7. Dashboard & reports ----------
  r = await call("manager1", "GET", "/api/dashboard");
  const dash = r.json || {};
  check("DASHBOARD loads", r.status === 200 && typeof dash.netSales?.net_sales === "number" && typeof dash.todaysStats?.todays_net_sales === "number", r.text);
  check("DASHBOARD today includes this payment", dash.todaysStats?.todays_net_sales >= expectedSubtotal - 80 && dash.todaysStats?.todays_discounts >= 80, JSON.stringify(dash.todaysStats));
  check("DASHBOARD latest orders + top items", Array.isArray(dash.latestOrders) && dash.latestOrders.length > 0 && Array.isArray(dash.topItems) && dash.topItems.length > 0, "");
  const day = today();
  const expectKeys = {
    sales: ["date", "total_orders", "total_sales", "total_discount", "net_sales"],
    products: ["product_name", "total_qty", "total_sales", "sales_percentage"],
    financial: ["total_sales", "total_discount", "net_income"],
    orders: ["order_id", "table_no", "status", "total_amount"],
  };
  for (const [type, keys] of Object.entries(expectKeys)) {
    r = await call("manager1", "POST", "/api/reports", { reportType: type, startDate: day, endDate: day });
    const row = r.json?.data?.[0];
    check(`REPORT ${type} (today)`, r.status === 200 && row && keys.every((k) => k in row), r.text);
  }
  r = await call("manager1", "POST", "/api/reports", { reportType: "bogus", startDate: day, endDate: day });
  check("REPORT invalid type rejected (400)", r.status === 400, r.text);
  r = await call("manager1", "POST", "/api/reports", { reportType: "sales", startDate: "not-a-date", endDate: "x" });
  check("SEC-7 database error shows no technical details", r.status === 500 && !("details" in (r.json || {})) && !/SQL|Incorrect|mysql/i.test(r.text), r.text);

  // BUG-12 route safety: only real picture files from the upload folder
  for (const p of ["/uploads/menu/..%2F..%2Fpackage.json", "/uploads/menu/..%2F..%2F.env.local", "/uploads/menu/does-not-exist.jpg", "/uploads/menu/x.html"]) {
    const res = await fetch(BASE + p);
    check(`BUG-12 ${p} → 404`, res.status === 404, `status ${res.status}`);
  }


  // ---------- 9. Security batch S1 (round 7) ----------
  const mkStaff = async (prefix, role, phone) => {
    const u = `${prefix}_${RUN}`;
    const res = await call("manager1", "POST", "/api/staff", { firstName: "Temp", lastName: "Staff", username: u, password: PASSWORD, role, phone });
    await login(u);
    return { u, id: res.json?.staff_id };
  };

  // S1-HDR: security headers on pages and API answers
  for (const [label, path] of [["page /login", "/login"], ["API /api/auth", "/api/auth"]]) {
    const res = await fetch(BASE + path, { redirect: "manual" });
    const h = (k) => res.headers.get(k) || "";
    check(`S1-HDR ${label} has security headers`,
      h("x-frame-options") === "DENY" && h("content-security-policy").includes("frame-ancestors 'none'") &&
      h("x-content-type-options") === "nosniff" && h("referrer-policy") === "same-origin" && h("permissions-policy").includes("camera=()"),
      [...res.headers].filter(([k]) => /frame|security|nosniff|referrer|permissions|content-type-options/.test(k)).map(([k, v]) => `${k}=${v}`).join("; "));
    check(`S1-HDR ${label} hides X-Powered-By`, !res.headers.has("x-powered-by"), h("x-powered-by"));
  }

  // S1-LOGIN: 10 wrong passwords pause that username (only that one)
  const tl = await mkStaff("throttle", "waiter", "0700000091");
  const codes = [];
  for (let i = 0; i < 10; i++) codes.push((await call(null, "POST", "/api/login", { username: tl.u, password: `wrong-${i}` })).status);
  check("S1-LOGIN 10 wrong passwords → 401 each", codes.every((c) => c === 401), codes.join(","));
  r = await call(null, "POST", "/api/login", { username: tl.u, password: "wrong-x" });
  check("S1-LOGIN 11th attempt is paused (429 + Retry-After)", r.status === 429 && Number(r.headers.get("retry-after")) > 0, `${r.status} ${r.headers.get("retry-after")} ${r.text}`);
  r = await call(null, "POST", "/api/login", { username: tl.u.toUpperCase(), password: PASSWORD });
  check("S1-LOGIN even the right password waits while paused (429)", r.status === 429, `${r.status}`);
  r = await login("waiter1");
  check("S1-LOGIN other users are not affected (200)", r.status === 200, `${r.status}`);

  // S1-ROLE: the current role counts, not the role inside the login token
  const tc = await mkStaff("cashierS1", "cashier", "0700000092");
  r = await call("manager1", "POST", "/api/orders", { table_id: 3, items: [{ menu_item_id: 7, qty: 1, price: priceOf[7] }] });
  const orderR = r.json?.orderId;
  await call("manager1", "PUT", `/api/staff/${tc.id}`, { firstName: "Temp", lastName: "Staff", role: "waiter", phone: "0700000092", username: tc.u });
  r = await call(tc.u, "POST", `/api/orders/${orderR}/payment`, { order_id: orderR, subtotal: priceOf[7], discount: 0 });
  check("S1-ROLE demoted cashier cannot take a payment with the old login (403)", r.status === 403, `${r.status} ${r.text}`);
  r = await call(tc.u, "GET", "/api/auth");
  check("S1-ROLE /api/auth shows the current role", r.status === 200 && r.json?.role === "waiter", r.text);
  await call("manager1", "PATCH", `/api/staff/${tc.id}`, { is_active: false });
  r = await call(tc.u, "GET", "/api/auth");
  check("S1-ROLE /api/auth refuses a deactivated account (401)", r.status === 401, `${r.status}`);
  await call("manager1", "DELETE", `/api/orders/${orderR}`);

  // S1-ORD: a waiter adds items only to his/her own orders (owner decision Q1 = A)
  const tw = await mkStaff("waiterS1", "waiter", "0700000093");
  r = await call(tw.u, "POST", "/api/orders", { table_id: 4, notes: "S1-ORD", items: [{ menu_item_id: 7, qty: 1, price: priceOf[7] }] });
  const orderW = r.json?.orderId;
  check("S1-ORD setup: second waiter's order", r.status === 200 && Number.isInteger(orderW), r.text);
  r = await call("waiter1", "POST", `/api/orders/${orderW}`, { orderId: orderW, items: [{ menu_item_id: 7, qty: 5, price: priceOf[7] }] });
  check("S1-ORD waiter cannot add items to another waiter's order (403)", r.status === 403, `${r.status} ${r.text}`);
  r = await call(tw.u, "POST", `/api/orders/${orderW}`, { orderId: orderA, items: [{ menu_item_id: 7, qty: 1, price: priceOf[7] }] });
  check("S1-ORD order id in the body must match the address (400)", r.status === 400, `${r.status} ${r.text}`);
  r = await call(tw.u, "POST", `/api/orders/${orderW}`, { orderId: orderW, items: [{ menu_item_id: 7, qty: 1, price: priceOf[7] }] });
  check("S1-ORD waiter can add items to own order (200)", r.status === 200, r.text);
  r = await call("manager1", "POST", `/api/orders/${orderW}`, { orderId: orderW, items: [{ menu_item_id: 7, qty: 1, price: priceOf[7] }] });
  check("S1-ORD manager can add items to any order (200)", r.status === 200, r.text);
  r = await call("waiter1", "POST", "/api/orders/999999", { orderId: 999999, items: [{ menu_item_id: 7, qty: 1, price: priceOf[7] }] });
  check("S1-ORD unknown order → 404", r.status === 404, `${r.status}`);
  r = await call("manager1", "GET", `/api/orders/${orderW}`);
  check("S1-ORD order has exactly the allowed items (3)", (r.json?.items || []).reduce((n, i) => n + i.qty, 0) === 3, JSON.stringify((r.json?.items || []).map((i) => i.qty)));
  r = await call("waiter1", "GET", "/api/orders/by-table?table_id=4");
  check("S1-ORD checkout list: waiter does not see another waiter's order", r.status === 200 && Array.isArray(r.json) && !r.json.some((o) => o.order_id === orderW), r.text.slice(0, 200));
  r = await call(tw.u, "GET", "/api/orders/by-table?table_id=4");
  check("S1-ORD checkout list: waiter sees own order", r.status === 200 && r.json?.some((o) => o.order_id === orderW), r.text.slice(0, 200));
  r = await call("cashier1", "GET", "/api/orders/by-table?table_id=4");
  check("S1-ORD checkout list: cashier sees all open orders", r.status === 200 && r.json?.some((o) => o.order_id === orderW), r.text.slice(0, 200));
  await call(tw.u, "DELETE", `/api/orders/${orderW}`);
  await call("manager1", "PATCH", `/api/staff/${tw.id}`, { is_active: false });

  // S1-VAL: the server applies the staff form's rules
  const good = { firstName: "Valid", lastName: "Person", username: `val_${RUN}`, password: PASSWORD, role: "waiter", phone: "0700000094" };
  for (const [label, body] of [
    ["missing password", { ...good, password: undefined }],
    ["short password", { ...good, password: "abc" }],
    ["bad phone", { ...good, phone: "12345" }],
    ["unknown role", { ...good, role: "owner" }],
    ["short username", { ...good, username: "ab" }],
    ["name with digits", { ...good, firstName: "R2D2" }],
  ]) {
    r = await call("manager1", "POST", "/api/staff", body);
    check(`S1-VAL new staff: ${label} → 400`, r.status === 400 && /معلومات کارمند/.test(r.json?.error || ""), `${r.status} ${r.text}`);
  }
  r = await call("manager1", "PUT", `/api/staff/${tl.id}`, { firstName: "Temp", lastName: "Staff", role: "owner", phone: "0700000091", username: tl.u });
  check("S1-VAL edit staff: unknown role → 400", r.status === 400 && /معلومات کارمند/.test(r.json?.error || ""), `${r.status} ${r.text}`);
  r = await call("manager1", "PUT", `/api/staff/${tl.id}`, { firstName: "Temp", lastName: "Staff", role: "waiter", phone: "0700000091", username: tl.u });
  check("S1-VAL edit staff: valid data still saved (200)", r.status === 200, `${r.status} ${r.text}`);
  await call("manager1", "PATCH", `/api/staff/${tl.id}`, { is_active: false });

  // S1-MGR: always keep at least one active manager
  r = await call("manager1", "PATCH", "/api/staff/1", { is_active: false });
  check("S1-MGR manager cannot deactivate own account (400)", r.status === 400 && /حساب خود/.test(r.json?.error || ""), `${r.status} ${r.text}`);
  const tm = await mkStaff("managerS1", "manager", "0700000095");
  r = await call("manager1", "PUT", `/api/staff/${tm.id}`, { firstName: "Temp", lastName: "Staff", role: "waiter", phone: "0700000095", username: tm.u });
  check("S1-MGR a manager can be demoted while another manager remains (200)", r.status === 200, `${r.status} ${r.text}`);
  await call("manager1", "PATCH", `/api/staff/${tm.id}`, { is_active: false });
  r = await call("manager1", "GET", "/api/staff");
  const activeManagers = (r.json || []).filter((s) => s.role === "manager" && s.active);
  if (activeManagers.length === 1 && activeManagers[0].username === "manager1") {
    r = await call("manager1", "PUT", "/api/staff/1", { firstName: "Manager", lastName: "One", role: "waiter", phone: "0700000001", username: "manager1" });
    check("S1-MGR the last active manager cannot be demoted (400)", r.status === 400 && /مدیر فعال/.test(r.json?.error || ""), `${r.status} ${r.text}`);
    if (r.status === 200) console.log("!! manager1 was demoted: re-create rms_test (see database/README.md) before testing again.");
  } else {
    record("KNOWN", "S1-MGR last-manager check skipped: rms_test has other active managers", activeManagers.map((m) => m.username).join(","));
  }
  r = await call("manager1", "GET", "/api/staff");
  check("S1-MGR manager1 is still an active manager", (r.json || []).some((s) => s.username === "manager1" && s.role === "manager" && s.active), "");

  r = await call("manager1", "POST", "/api/logout");
  check("AUTH logout", r.status === 200, r.text);

  // ---------- Summary ----------
  const n = (s) => results.filter((x) => x.status === s).length;
  console.log(`\nSUMMARY  PASS=${n("PASS")}  FAIL=${n("FAIL")}  KNOWN=${n("KNOWN")}  TOTAL=${results.length}`);
  process.exitCode = n("FAIL") ? 1 : 0;
}

main().catch((e) => {
  console.error("TEST RUN ABORTED:", e.message);
  console.error("Is the app running and connected to rms_test?");
  process.exitCode = 2;
});
