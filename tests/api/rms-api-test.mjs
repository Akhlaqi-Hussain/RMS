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
  r = await call(null, "POST", "/api/login", { username: "nobody_xyz", password: "whatever1" });
  check("AUTH unknown user rejected (401)", r.status === 401, r.text);
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
