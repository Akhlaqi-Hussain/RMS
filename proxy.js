import { NextResponse } from "next/server";
import { getActiveUser } from "./lib/session";
import { secureCookie } from "./lib/cookieOptions";
import { licenceStatus, LICENCE_REQUIRED, LICENCE_READ_ONLY } from "./lib/licence/state.mjs";
import { ensureSetupCode, firstRunNeeded } from "./lib/firstRun.mjs";

// R9-LIC: what still works in read-only mode (licence expired or clock wrong):
// every GET, plus logging in/out, the licence page, backups and reports.
const READ_ONLY_ALLOWED = ["/api/login", "/api/logout", "/api/licence", "/api/reports", "/api/backups", "/api/backups/settings"];

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  // R9-LIC: the licence page is always reachable
  if (pathname === "/licence" || pathname === "/api/licence") {
    return NextResponse.next();
  }
  // R9-LIC: without a valid licence (installed RMS) only the licence page works
  const licence = await licenceStatus();
  if (licence.blocked) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: LICENCE_REQUIRED }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/licence", req.url));
  }

  // R9-SETUP: first start — no active manager yet → first-run setup page
  if (pathname === "/setup" || pathname === "/api/setup") {
    if (await firstRunNeeded()) ensureSetupCode();
    return NextResponse.next(); // the setup page and API check everything themselves
  }

  // Public route: login
  if (pathname === "/login") {
    if (await firstRunNeeded()) {
      ensureSetupCode();
      return NextResponse.redirect(new URL("/setup", req.url));
    }
    const user = await getActiveUser(req);
    if (user) {
      return NextResponse.redirect(new URL("/main", req.url));
    }
    return NextResponse.next();
  }

  // Protected API routes (SEC-1): every /api route needs a valid login,
  // except the ones listed as public. Management APIs need the manager role,
  // matching the existing page rules for /main/manage, /main/reports, /main/dashboard.
  if (pathname.startsWith("/api/")) {
    const publicApi = ["/api/login", "/api/logout", "/api/auth"];
    if (publicApi.includes(pathname)) {
      return NextResponse.next();
    }

    const user = await getActiveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isRead = req.method === "GET";
    const managerOnly =
      pathname === "/api/staff" ||
      pathname.startsWith("/api/staff/") ||
      pathname === "/api/dashboard" ||
      pathname === "/api/reports" ||
      pathname.startsWith("/api/backups") ||
      (!isRead &&
        (pathname === "/api/tables" ||
          pathname.startsWith("/api/tables/") ||
          pathname === "/api/menu" ||
          pathname.startsWith("/api/menu/") ||
          pathname === "/api/categories"));

    if (managerOnly && user.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // R9-LIC: read-only mode — no new orders, payments or changes
    if (licence.readOnly && !isRead && !READ_ONLY_ALLOWED.includes(pathname)) {
      return NextResponse.json({ error: LICENCE_READ_ONLY }, { status: 403 });
    }

    return NextResponse.next();
  }

  // Protected routes: /main
  if (pathname.startsWith("/main")) {
    const user = await getActiveUser(req);
    if (!user) {
      // Invalid or missing token → redirect to login and clear cookie
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.set("token", "", {
        maxAge: 0,
        httpOnly: true,
        secure: secureCookie(), // PROD-2
        sameSite: "strict",
        path: "/",
      });
      return res;
    }

    if (
      ["/main/reports", "/main/manage", "/main/dashboard"].includes(pathname) &&
      user.role !== "manager"
    ) {
      return NextResponse.redirect(new URL("/main/orders", req.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

// NEXT-16: this file was called middleware.js before Next.js 16 ("proxy" is
// the new name; the behaviour is the same). A proxy always runs in the Node.js
// runtime, so it can check the account in the database (SEC-6, getActiveUser
// in lib/session.js) without the old `runtime: "nodejs"` setting.
export const config = {
  // The menu routes (/api/menu, /api/menu/<id>) are NOT run through this
  // proxy: in production, Next.js 15.5 broke request bodies larger than
  // about 1 MB that pass through Node.js middleware, which would break picture
  // uploads. Those two routes apply exactly the same checks themselves via
  // requireActiveUser() from lib/session.js.
  // R9-LIC / R9-SETUP: /licence and /setup added.
  matcher: ["/login", "/licence", "/setup", "/main/:path*", "/api/((?!menu(?:/|$)).*)"],
};
