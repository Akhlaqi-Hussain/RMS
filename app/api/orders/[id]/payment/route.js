import pool from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { publicErrorMessage, errorStatus } from "@/lib/errors";

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

    // Call confirmPayment procedure
    // BUG-2: pool.query() always returns its connection to the pool, even on errors
    const [results] = await pool.query("CALL confirmPayment(?, ?, ?)", [
      order_id,
      subtotal,
      discount,
    ]);

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
      JSON.stringify({ error: publicErrorMessage(error, "Failed to process payment") }),
      { status: errorStatus(error) }
    );
  }
}
