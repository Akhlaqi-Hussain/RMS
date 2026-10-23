import pool from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { publicErrorMessage, errorStatus } from "@/lib/errors";
import { secureCookie } from "@/lib/cookieOptions";
import { throttleKey, pausedFor, recordFailure, recordSuccess } from "@/lib/loginThrottle";

// S1-LOGIN: one message for "unknown user" and "wrong password", so the login
// form doesn't reveal which usernames exist.
const LOGIN_FAILED = "نام کاربری یا رمز عبور اشتباه است";
const TOO_MANY_ATTEMPTS = "تلاش‌های ناموفق زیاد است. لطفاً ۱۵ دقیقه بعد دوباره تلاش کنید";

// S1-LOGIN: for an unknown username a password check is still done against
// this dummy hash, so the answer takes about as long as for a real user.
let dummyHash = null;
async function getDummyHash() {
  if (!dummyHash) dummyHash = await bcrypt.hash("rms-timing-equaliser", 10);
  return dummyHash;
}

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const key = throttleKey(username);
    const waitMs = pausedFor(key);
    if (waitMs > 0) {
      return NextResponse.json(
        { success: false, message: TOO_MANY_ATTEMPTS },
        { status: 429, headers: { "Retry-After": String(Math.ceil(waitMs / 1000)) } }
      );
    }

    const [rows] = await pool.query("CALL login(?)", [username]);

    // Because CALL returns nested arrays, pick user properly
    const user = rows[0][0];

    // Compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(
      String(password ?? ""),
      user ? user.password : await getDummyHash()
    );
    if (!user || !isMatch) {
      recordFailure(key);
      return NextResponse.json(
        { success: false, message: LOGIN_FAILED },
        { status: 401 }
      );
    }
    recordSuccess(key);

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.staff_id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set JWT in cookie
    const response = NextResponse.json({
      success: true,
      message: "ورود موفقیت‌آمیز بود",
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: secureCookie(), // PROD-2: COOKIE_SECURE=false for http on the local network
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // production Mode

    // const isProd = process.env.NODE_ENV === "production";

    // response.cookies.set("token", token, {
    //   httpOnly: true,
    //   secure: isProd && process.env.USE_HTTPS === "true",
    //   sameSite: isProd ? "none" : "lax",
    //   maxAge: 7* 24 * 60 * 60,
    //   path: "/",
    // });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: publicErrorMessage(error) },
      { status: 500 }
    );
  }
}
