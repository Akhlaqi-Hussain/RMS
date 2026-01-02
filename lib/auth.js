import { jwtVerify } from "jose";

/**
 * Extract user (id, role, etc.) from the JWT cookie.
 * @param {NextRequest} req - The incoming request (App Router).
 * @returns {Promise<{id: number, role: string} | null>}
 */
export async function getUserFromToken(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    return { id: payload.id, role: payload.role };
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
