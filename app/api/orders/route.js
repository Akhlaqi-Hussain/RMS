import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import { getUserFromToken } from "@/lib/auth";
import { publicErrorMessage, errorStatus } from "@/lib/errors";

// Create new order
export async function POST(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { table_id, notes, items } = await req.json();

    if (!table_id || !items?.length) {
      return NextResponse.json(
        { error: "Table and items required" },
        { status: 400 }
      );
    }

    // BUG-4: the order and all its items are saved together or not at all
    const orderId = await withTransaction(async (conn) => {
      // Call stored procedure to create order
      const [orderRows] = await conn.query("CALL createOrder(?, ?, ?)", [
        table_id,
        user.id,
        notes || null,
      ]);
      const newOrderId = orderRows[0][0].order_id;

      // Add items
      for (const item of items) {
        await conn.query("CALL addOrderItems(?, ?, ?, ?)", [
          newOrderId,
          item.menu_item_id,
          item.qty,
          item.price,
        ]);
      }
      return newOrderId;
    });

    return NextResponse.json({ success: true, orderId });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json(
      { error: publicErrorMessage(err, "Failed to create order") },
      { status: errorStatus(err) }
    );
  }
}

// fetch orders based on user role
export async function GET(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rows;

    if (user.role === "waiter") {
      [rows] = await pool.query("CALL GetOrdersByWaiter(?)", [user.id]);
      rows = rows[0];
    } else if (
      user.role === "manager" ||
      user.role === "cashier" ||
      user.role === "chef"
    ) {
      [rows] = await pool.query("CALL GetOrders()");
      rows = rows[0];
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Fetch orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
