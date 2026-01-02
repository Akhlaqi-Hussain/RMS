import pool from "@/lib/db";

// GET dashboard data
export async function GET() {
  try {
    const [results] = await pool.query("CALL getDashboardStats()");

    const netSales = results[0][0]; // First result set: total net sales
    const todaysStats = results[1][0]; // Second: today's sales & orders
    const latestOrders = results[2]; // Third: latest 10 orders
    const topItems = results[3]; // Fourth: top selling items

    return new Response(
      JSON.stringify({ netSales, todaysStats, latestOrders, topItems }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch dashboard data" }),
      { status: 500 }
    );
  }
}
