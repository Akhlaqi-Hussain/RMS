import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("table_id");

    if (!tableId) {
      return NextResponse.json({ error: "table_id required" }, { status: 400 });
    }

    // Use your stored procedure for efficiency
    const [rows] = await pool.query("CALL GetActiveOrdersByTable(?)", [
      tableId,
    ]);

    return NextResponse.json(rows[0] || []);
  } catch (err) {
    console.error("Fetch orders by table error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
