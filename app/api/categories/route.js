// app/api/categories/route.js
import pool from "@/lib/db"; // adjust based on your db connection

// GET categories
export async function GET() {
  try {
    const [rows] = await pool.query("SELECT id, name FROM category");
    return Response.json(rows);
  } catch (error) {
    // BUG-9: a database problem used to crash the request without a clear answer
    console.error("Error fetching categories:", error);
    return Response.json({ error: "خطای سرور داخلی" }, { status: 500 });
  }
}

// POST new category
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return Response.json({ error: "Category name required" }, { status: 400 });
    }

    // BUG-9: a duplicate name used to end in an unexplained server error
    const [existing] = await pool.query(
      "SELECT id FROM category WHERE name = ?",
      [name]
    );
    if (existing.length > 0) {
      return Response.json({ error: "این کتگوری قبلاً وجود دارد" }, { status: 400 });
    }

    const [result] = await pool.query("INSERT INTO category (name) VALUES (?)", [
      name,
    ]);

    return Response.json({ id: result.insertId, name });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return Response.json({ error: "این کتگوری قبلاً وجود دارد" }, { status: 400 });
    }
    console.error("Error adding category:", error);
    return Response.json({ error: "خطای سرور داخلی" }, { status: 500 });
  }
}
