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
  matcher: ["/login", "/main/:path*"],
};
