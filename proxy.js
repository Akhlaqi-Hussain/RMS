import { NextResponse } from "next/server";
import { getActiveUser } from "./lib/session";

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  // Public route: login
  if (pathname === "/login") {
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
        secure: process.env.NODE_ENV === "production",
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
  matcher: ["/login", "/main/:path*", "/api/((?!menu(?:/|$)).*)"],
};
