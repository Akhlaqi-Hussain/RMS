// app/api/categories/route.js
import pool from "@/lib/db"; // adjust based on your db connection

// GET categories
export async function GET() {
  const [rows] = await pool.query("SELECT id, name FROM category");
  return Response.json(rows);
}

// POST new category
export async function POST(req) {
  const { name } = await req.json();
  if (!name) return new Response("Category name required", { status: 400 });

  const [result] = await pool.query("INSERT INTO category (name) VALUES (?)", [
    name,
  ]);

  return Response.json({ id: result.insertId, name });
}
