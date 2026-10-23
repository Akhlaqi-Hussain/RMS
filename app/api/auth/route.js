import { NextResponse } from "next/server";
// S1-ROLE: the CURRENT role and active status from the database, not the role
// saved in the 7-day login token (a demoted or deactivated user loses rights at once).
import { getActiveUser } from "@/lib/session";

export async function GET(request) {
  try {
    const user = await getActiveUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error in /api/auth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
