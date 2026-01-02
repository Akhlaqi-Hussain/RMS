import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // Clear the JWT cookie
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  // produnction Mode

  // const isProd = process.env.NODE_ENV === "production";

  // response.cookies.set("token", "", {
  //   httpOnly: true,
  //   secure: isProd && process.env.USE_HTTPS === "true",
  //   sameSite: isProd ? "none" : "lax",
  //   maxAge: 0,
  //   path: "/",
  // });

  return res;
}
