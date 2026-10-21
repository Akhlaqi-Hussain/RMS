import { NextResponse } from "next/server";
import pool from "./db";
import { getUserFromToken } from "./auth";

// SEC-6: a valid token is not enough — the account must still exist and be
// active in the database, and its CURRENT role is used (not the role stored
// in the token at login time). A deactivated user is therefore locked out on
// the very next request instead of after the token expires (7 days).
// If the database can't be reached, access is refused (safe default).
export async function getActiveUser(req) {
  const user = await getUserFromToken(req);
  if (!user) return null;
  try {
    const [rows] = await pool.query(
      "SELECT role, is_active FROM staff WHERE staff_id = ?",
      [user.id]
    );
    if (rows.length === 0 || !rows[0].is_active) return null;
    return { id: user.id, role: rows[0].role };
  } catch (err) {
    console.error("Account check failed:", err);
    return null;
  }
}

// Same rules as middleware.js, for the routes the middleware skips
// (the menu routes, which receive large picture uploads — see middleware.js).
// Returns { user } when allowed, or { response } to send back immediately.
export async function requireActiveUser(req, { managerOnly = false } = {}) {
  const user = await getActiveUser(req);
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (managerOnly && user.role !== "manager") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}
