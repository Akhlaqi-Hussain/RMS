import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(`call getTables()`);

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "خطا در دریافت لیست میزها" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { table_no } = await req.json();

    if (!table_no || String(table_no).trim().length === 0) {
      return NextResponse.json(
        { error: "شماره میز الزامی است" },
        { status: 400 }
      );
    }

    // Check for duplicate table number
    const [existing] = await pool.query(
      "SELECT table_id FROM tables WHERE table_no = ?",
      [table_no]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "شماره میز تکراری است" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      "INSERT INTO tables (table_no) VALUES (?)",
      [table_no]
    );

    const [newTable] = await pool.query(
      "SELECT table_id, table_no, is_active FROM tables WHERE table_id = ?",
      [result.insertId]
    );

    return NextResponse.json(newTable[0]);
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "خطا در ایجاد میز جدید" },
      { status: 500 }
    );
  }
}
