import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET - Get single table
export async function GET(req, { params }) {
  try {
    const { id } = params;

    const [tables] = await pool.query(
      "SELECT * FROM tables WHERE table_id = ?",
      [id]
    );

    if (tables.length === 0) {
      return NextResponse.json({ error: "میز پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json(tables[0]);
  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات میز" },
      { status: 500 }
    );
  }
}

// PUT - Edit table
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { table_no } = await req.json();

    if (!table_no || table_no.trim().length === 0) {
      return NextResponse.json(
        { error: "شماره میز الزامی است" },
        { status: 400 }
      );
    }

    // Check for duplicate table number (excluding current table)
    const [existing] = await pool.query(
      "SELECT table_id FROM tables WHERE table_no = ? AND table_id != ?",
      [table_no, id]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "شماره میز تکراری است" },
        { status: 400 }
      );
    }

    // Update the table
    const [result] = await pool.query(`CALL updateTable(?, ?)`, [id, table_no]);

    return NextResponse.json({
      message: "میز با موفقیت ویرایش شد",
      table_id: id,
      table_no: table_no,
    });
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json({ error: "خطا در ویرایش میز" }, { status: 500 });
  }
}

// DELETE - Delete table
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // Check if table has active orders
    const [activeOrders] = await pool.query(
      "SELECT COUNT(*) as order_count FROM orders WHERE table_id = ?",
      [id]
    );

    if (activeOrders[0].order_count > 0) {
      return NextResponse.json(
        { error: "امکان حذف میز با سفارش وجود ندارد" },
        { status: 400 }
      );
    }

    // Delete the table
    const [result] = await pool.query("DELETE FROM tables WHERE table_id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "میز پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json({
      message: "میز با موفقیت حذف شد",
      deleted_id: id,
    });
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json({ error: "خطا در حذف میز" }, { status: 500 });
  }
}

// PATCH - Update table status
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { is_active } = await req.json();

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "وضعیت باید بولین باشد" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      "UPDATE tables SET is_active = ? WHERE table_id = ?",
      [is_active, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "میز پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json({
      message: `میز ${is_active ? "فعال" : "غیرفعال"} شد`,
      table_id: id,
      is_active: is_active,
    });
  } catch (error) {
    console.error("Error updating table status:", error);
    return NextResponse.json(
      { error: "خطا در تغییر وضعیت میز" },
      { status: 500 }
    );
  }
}
