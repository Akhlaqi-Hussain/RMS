import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { validateMenuImage } from "@/lib/upload";
import { publicErrorMessage, errorStatus } from "@/lib/errors";
import { requireActiveUser } from "@/lib/session";

// PUT -> Update menu item
export async function PUT(req, { params }) {
  // SEC-1/SEC-6: this route is skipped by proxy.js (large uploads), so it checks itself
  const auth = await requireActiveUser(req, { managerOnly: true });
  if (auth.response) return auth.response;


  try {
    const { id } = await params;
    const formData = await req.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const category = formData.get("category");
    const price = formData.get("price");
    const imageFile = formData.get("image");

    // Check if item exists
    const [existingItem] = await pool.query(
      "SELECT id, image FROM menu_items WHERE id = ?",
      [id]
    );

    if (existingItem.length === 0) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Check for duplicate name in other items
    const [duplicate] = await pool.query(
      "SELECT id FROM menu_items WHERE name = ? AND category = ? AND id != ? LIMIT 1",
      [name, category, id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { error: "آیتم با این نام در همین دسته‌بندی موجود است" },
        { status: 400 }
      );
    }

    let filename = existingItem[0].image; // Keep existing image by default

    // Handle new image upload
    if (imageFile && imageFile.name && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const check = validateMenuImage(buffer);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      filename = check.filename;

      const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");
      await mkdir(uploadDir, { recursive: true });

      // Delete old image if exists
      if (existingItem[0].image) {
        const oldImagePath = path.join(uploadDir, existingItem[0].image);
        try {
          await unlink(oldImagePath);
        } catch (error) {
          console.error("Error deleting old image:", error);
          // Continue with new image upload even if old deletion fails
        }
      }

      await writeFile(path.join(uploadDir, filename), buffer);
    }

    // Update item in DB - Add status parameter
    const [rows] = await pool.query("CALL UpdateMenuItem(?, ?, ?, ?, ?, ?)", [
      id,
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

// PATCH -> Update menu item status only
export async function PATCH(req, { params }) {
  // SEC-1/SEC-6: this route is skipped by proxy.js (large uploads), so it checks itself
  const auth = await requireActiveUser(req, { managerOnly: true });
  if (auth.response) return auth.response;


  try {
    const { id } = await params;
    const { is_active } = await req.json();

    // Validate input
    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "وضعیت باید بولین باشد" },
        { status: 400 }
      );
    }

    // Check if item exists
    const [existingItem] = await pool.query(
      "SELECT id FROM menu_items WHERE id = ?",
      [id]
    );

    if (existingItem.length === 0) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Update status in database
    const [result] = await pool.query(
      "UPDATE menu_items SET is_active = ? WHERE id = ?",
      [is_active, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "خطا در بروزرسانی وضعیت" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `آیتم ${is_active ? "فعال" : "غیرفعال"} شد`,
      id: id,
      is_active: is_active,
    });
  } catch (error) {
    console.error("Error updating menu item status:", error);
    return NextResponse.json(
      { error: "خطا در تغییر وضعیت آیتم" },
      { status: 500 }
    );
  }
}

// DELETE -> Delete menu item
export async function DELETE(req, { params }) {
  // SEC-1/SEC-6: this route is skipped by proxy.js (large uploads), so it checks itself
  const auth = await requireActiveUser(req, { managerOnly: true });
  if (auth.response) return auth.response;


  try {
    const { id } = await params;

    // Check if item exists and get image path
    const [existingItem] = await pool.query(
      "SELECT id, image FROM menu_items WHERE id = ?",
      [id]
    );

    if (existingItem.length === 0) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Check if item is in the order_items table
    const [activeOrders] = await pool.query(
      "SELECT COUNT(*) as order_count FROM order_items WHERE menu_item_id = ?",
      [id]
    );

    if (activeOrders[0].order_count > 0) {
      return NextResponse.json(
        { error: "امکان حذف آیتم وجود ندارد" },
        { status: 400 }
      );
    }

    // Delete image file if exists
    if (existingItem[0].image) {
      const imagePath = path.join(
        process.cwd(),
        "public",
        "uploads",
        "menu",
        existingItem[0].image
      );
      try {
        await unlink(imagePath);
      } catch (error) {
        console.error("Error deleting image file:", error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    const [result] = await pool.query("DELETE FROM menu_items WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "خطا در حذف آیتم" }, { status: 500 });
    }

    return NextResponse.json({
      message: "آیتم با موفقیت حذف شد",
      deleted_id: id,
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json({ error: "خطا در حذف آیتم" }, { status: 500 });
  }
}

// GET -> Get single menu item
export async function GET(req, { params }) {
  // SEC-1/SEC-6: this route is skipped by proxy.js (large uploads), so it checks itself
  const auth = await requireActiveUser(req);
  if (auth.response) return auth.response;


  try {
    const { id } = await params;

    const [items] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [
      id,
    ]);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json(items[0]);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات آیتم" },
      { status: 500 }
    );
  }
}
