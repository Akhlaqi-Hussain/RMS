import pool from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { publicErrorMessage, errorStatus } from "@/lib/errors";
import { secureCookie } from "@/lib/cookieOptions";

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const [rows] = await pool.query("CALL login(?)", [username]);

    // Because CALL returns nested arrays, pick user properly
    const user = rows[0][0];

    if (!user) {
      return NextResponse.json(
        { success: false, message: "نام کاربری یافت نشد" },
        { status: 401 }
      );
    }

    // Compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

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
