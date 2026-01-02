import pool from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

// Confirm payment
export async function POST(req) {
  try {
    const user = await getUserFromToken(req);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    if (user.role !== "manager" && user.role !== "cashier") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // Parse body
    const { order_id, subtotal, discount } = await req.json();

    if (!order_id || !subtotal) {
      return new Response(
        JSON.stringify({
          error: "order_id, subtotal, and discount are required",
        }),
        { status: 400 }
      );
    }

    const conn = await pool.getConnection();
    console.log(`confirmPayment(${order_id}, ${subtotal}, ${discount})`);

    // Call confirmPayment procedure
    const [results] = await conn.query("CALL confirmPayment(?, ?, ?)", [
      order_id,
      subtotal,
      discount,
    ]);
    conn.release();

    // results[0] contains SELECT from procedure
    const paymentResult = results?.[0]?.[0] || null;

    return new Response(
      JSON.stringify({
        success: true,
        message: paymentResult?.msg || paymentResult?.war || "Unknown result",
        payment: paymentResult,
        role: user.role,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process payment" }),
      { status: 500 }
    );
  }
}
