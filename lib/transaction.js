import pool from "@/lib/db";

// BUG-4: run several database steps as ONE transaction on one connection.
// If any step fails (e.g. an inactive menu item), every step is undone, so
// no half-saved order (an order without its items) is left behind.
// The connection always goes back to the pool (see BUG-2).
export async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // the original error is the one that matters
    }
    throw err;
  } finally {
    conn.release();
  }
}
