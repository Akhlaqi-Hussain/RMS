import { NextResponse } from "next/server";
import { getUserFromToken } from "./lib/auth";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  // Public route: login
  if (pathname === "/login") {
    const user = await getUserFromToken(req);
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

    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isRead = req.method === "GET";
    const managerOnly =
      pathname === "/api/staff" ||
      pathname.startsWith("/api/staff/") ||
      pathname === "/api/dashboard" ||
      pathname === "/api/reports" ||
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
    const user = await getUserFromToken(req);
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

export const config = {
  matcher: ["/login", "/main/:path*", "/api/:path*"],
};
