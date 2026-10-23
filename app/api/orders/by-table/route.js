import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getActiveUser } from "@/lib/session";

export async function GET(req) {
  try {
    const user = await getActiveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("table_id");

    if (!tableId) {
      return NextResponse.json({ error: "table_id required" }, { status: 400 });
    }

    // Use your stored procedure for efficiency
    const [rows] = await pool.query("CALL GetActiveOrdersByTable(?)", [
      tableId,
    ]);
    let orders = rows[0] || [];

    // S1-ORD: a waiter may only add items to his/her own orders, so the
    // checkout list ("existing order") shows a waiter only his/her own open
    // orders at this table. Other roles still see all open orders.
    if (user.role === "waiter") {
      const [own] = await pool.query(
        "SELECT order_id FROM orders WHERE table_id = ? AND status = 'open' AND staff_id = ?",
        [tableId, user.id]
      );
      const ownIds = new Set(own.map((o) => Number(o.order_id)));
      orders = orders.filter((o) => ownIds.has(Number(o.order_id)));
    }

    return NextResponse.json(orders);
  } catch (err) {
    console.error("Fetch orders by table error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
