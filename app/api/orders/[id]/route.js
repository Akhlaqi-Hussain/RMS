import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

//Add items to an existing order
export async function POST(req, { params }) {
  try {
    const user = await getUserFromToken(req);
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, items } = await req.json();

    if (!orderId || !items?.length) {
      console.log(orderId, items);
      return NextResponse.json(
        { error: "Order ID and items are required" },
        { status: 400 }
      );
    }

    for (const item of items) {
      await pool.query("CALL addOrderItems(?, ?, ?, ?)", [
        orderId,
        item.menu_item_id,
        item.qty,
        item.price,
      ]);
    }

    return NextResponse.json({ success: true, orderId });
  } catch (err) {
    console.error("Add items error:", err);
    return NextResponse.json({ error: "Failed to add items" }, { status: 500 });
  }
}
// fetch order Details
export async function GET(req, { params }) {
  const { id } = await params;

  if (!id) {
    return new Response(JSON.stringify({ error: "Order ID is required" }), {
      status: 400,
    });
  }

  try {
    const user = await getUserFromToken(req);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const conn = await pool.getConnection();

    // Call the stored procedure
    const [results] = await conn.query("CALL getOrderDetails(?)", [id]);
    conn.release();

    // MySQL stored procedure returns an array of result sets
    const orderInfo = results[0]?.[0] || null; // first SELECT (order details)
    const orderItems = results[1] || []; // second SELECT (items)
    const billDetails = results[2]?.[0] || [];

    if (!orderInfo) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
      });
    }

    return new Response(
      JSON.stringify({
        order: orderInfo,
        items: orderItems,
        bill: billDetails,
        role: user.role,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching order details:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}

// cancel order
export async function DELETE(req, { params }) {
  const { id } = await params;

  if (!id) {
    return new Response(JSON.stringify({ error: "Order ID is required" }), {
      status: 400,
    });
  }

  try {
    const user = await getUserFromToken(req);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const conn = await pool.getConnection();

    // First cancel the order
    await conn.query("CALL cancelOrder(?)", [id]);

    return new Response(
      JSON.stringify({
        message: "Order canceled successfully",
        role: user.role,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error canceling order:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}

// Update all order items status to in-progress
export async function PATCH(req, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Order ID is required" },
      { status: 400 }
    );
  }

  try {
    const user = await getUserFromToken(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await pool.getConnection();

    // Update all order items status to 'in-progress' for this order
    const [result] = await conn.query(
      "UPDATE order_items SET status = 'in-progress' WHERE order_id = ? AND status = 'pending'",
      [id]
    );

    conn.release();

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "No pending order items found" }, // More accurate error message
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `${result.affectedRows} order item(s) status updated to in-progress`,
      order_id: id,
      status: "in-progress",
      updated_count: result.affectedRows,
    });
  } catch (error) {
    console.error("Error updating order items status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
