import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import { getUserFromToken } from "@/lib/auth";
import { publicErrorMessage, errorStatus } from "@/lib/errors";

// SEC-5: order access rules.
// - A waiter may only open, cancel or send to the kitchen his/her OWN orders
//   (the orders list already shows waiters only their own orders).
// - A chef may open orders and send them to the kitchen, but may not cancel.
// - Managers and cashiers keep full access.
// BUG-2: every query uses pool.query(), which always returns its connection to
// the pool (the old code could keep connections forever and freeze the app).

async function findOrderOwner(id) {
  const [rows] = await pool.query("SELECT staff_id FROM orders WHERE order_id = ?", [id]);
  return rows[0] || null;
}

function isOtherWaitersOrder(user, order) {
  return user.role === "waiter" && Number(order.staff_id) !== Number(user.id);
}

//Add items to an existing order
export async function POST(req, { params }) {
  try {
    const user = await getUserFromToken(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, items } = await req.json();

    if (!orderId || !items?.length) {
      return NextResponse.json(
        { error: "Order ID and items are required" },
        { status: 400 }
      );
    }

    // BUG-4: all new items are added together or not at all
    await withTransaction(async (conn) => {
      for (const item of items) {
        await conn.query("CALL addOrderItems(?, ?, ?, ?)", [
          orderId,
          item.menu_item_id,
          item.qty,
          item.price,
        ]);
      }
    });

    return NextResponse.json({ success: true, orderId });
  } catch (err) {
    console.error("Add items error:", err);
    return NextResponse.json(
      { error: publicErrorMessage(err, "Failed to add items") },
      { status: errorStatus(err) }
    );
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

    const owner = await findOrderOwner(id);
    if (!owner) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
      });
    }
    if (isOtherWaitersOrder(user, owner)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // Call the stored procedure
    const [results] = await pool.query("CALL getOrderDetails(?)", [id]);

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

    if (user.role === "chef") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    const owner = await findOrderOwner(id);
    if (!owner) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
      });
    }
    if (isOtherWaitersOrder(user, owner)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // First cancel the order
    await pool.query("CALL cancelOrder(?)", [id]);

    return new Response(
      JSON.stringify({
        message: "Order canceled successfully",
        role: user.role,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error canceling order:", error);
    return new Response(
      JSON.stringify({ error: publicErrorMessage(error, "Internal Server Error") }),
      { status: errorStatus(error) }
    );
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

    const owner = await findOrderOwner(id);
    if (!owner) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (isOtherWaitersOrder(user, owner)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update all order items status to 'in-progress' for this order
    const [result] = await pool.query(
      "UPDATE order_items SET status = 'in-progress' WHERE order_id = ? AND status = 'pending'",
      [id]
    );

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
