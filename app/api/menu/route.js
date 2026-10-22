import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { validateMenuImage } from "@/lib/upload";
import { publicErrorMessage, errorStatus } from "@/lib/errors";
import { requireActiveUser } from "@/lib/session";

// POST -> Add menu item with image
export async function POST(req) {
  // SEC-1/SEC-6: this route is skipped by proxy.js (large uploads), so it checks itself
  const auth = await requireActiveUser(req, { managerOnly: true });
  if (auth.response) return auth.response;


  try {
    const formData = await req.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const category = formData.get("category");
    const price = formData.get("price");
    const imageFile = formData.get("image");

    // Check if item already exists
    const [existing] = await pool.query(
      "SELECT id FROM menu_items WHERE name = ? AND category = ? LIMIT 1",
      [name, category]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "آیتم در سیستم موجود است" },
        { status: 400 }
      );
    }

    //Handle image upload
    let filename = null;
    if (imageFile && imageFile.name) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const check = validateMenuImage(buffer);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      filename = check.filename;

      const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");
      await mkdir(uploadDir, { recursive: true });

      await writeFile(path.join(uploadDir, filename), buffer);
    }

    //Insert item into DB
    const [rows] = await pool.query("CALL addItem(?, ?, ?, ?, ?)", [
      name,
      description,
      category,
      price,
      filename,
    ]);

    const result = rows[0][0];
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: publicErrorMessage(error) },
      { status: errorStatus(error) }
    );
  }
}

// GET -> Fetch items (all or by category)
export async function GET(req) {
  // SEC-1/SEC-6: this route is skipped by proxy.js (large uploads), so it checks itself
  const auth = await requireActiveUser(req);
  if (auth.response) return auth.response;


  try {
    const { searchParams } = new URL(req.url);
    const catId = searchParams.get("categoryId");

    // Call stored procedure
    const [rows] = await pool.query("CALL GetMenuItems(?)", [catId || 0]);

    // When using CALL, MySQL returns results wrapped in an array
    const items = rows[0];

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: publicErrorMessage(error) },
      { status: errorStatus(error) }
    );
  }
}
