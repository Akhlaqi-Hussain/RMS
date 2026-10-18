import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import pool from "@/lib/db";
import bcrypt from "bcrypt";

// GET - Get staff by ID
export async function GET(request, { params }) {
  try {
    // Check authentication
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "دسترسی غیر مجاز" }, { status: 401 });
    }

    // Only managers can access staff data
    if (currentUser.role !== "manager") {
      return NextResponse.json(
        { error: "شما اجازه دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Call the stored procedure
    const [rows] = await pool.query("CALL getStaffById(?)", [id]);

    // Extract staff data from the result
    const staff = rows[0] && rows[0][0] ? rows[0][0] : null;

    if (!staff) {
      return NextResponse.json({ error: "کارمند یافت نشد" }, { status: 404 });
    }

    // Remove password from response
    const { password, ...staffWithoutPassword } = staff;

    return NextResponse.json(staffWithoutPassword);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "خطای سرور داخلی" }, { status: 500 });
  }
}

// PUT - Update staff
export async function PUT(request, { params }) {
  try {
    // Check authentication
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: "دسترسی غیر مجاز" }, { status: 401 });
    }

    // Only managers can edit staff
    if (currentUser.role !== "manager") {
      return NextResponse.json(
        { error: "شما اجازه ویرایش کارمند را ندارید" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const updateData = await request.json();

    // Validate required fields
    const { firstName, lastName, role, phone, username } = updateData;
    if (!firstName || !lastName || !role || !phone || !username) {
      return NextResponse.json(
        { error: "تمامی فیلدهای ضروری باید پر شوند" },
        { status: 400 }
      );
    }

    // Check if staff exists
    const [existingRows] = await pool.query("CALL getStaffById(?)", [id]);
    const existingStaff =
      existingRows[0] && existingRows[0][0] ? existingRows[0][0] : null;

    if (!existingStaff) {
      return NextResponse.json({ error: "کارمند یافت نشد" }, { status: 404 });
    }

    // Check if username is taken by another staff
    const [usernameRows] = await pool.query("CALL checkUsernameExists(?, ?)", [
      username,
      id,
    ]);
    const usernameExists =
      usernameRows[0] && usernameRows[0][0]
        ? usernameRows[0][0].count > 0
        : false;

    if (usernameExists) {
      return NextResponse.json(
        { error: "این نام کاربری قبلاً استفاده شده است" },
        { status: 400 }
      );
    }

    // Prepare update data
    let updateQuery = "CALL updateStaff(?, ?, ?, ?, ?, ?)";
    let queryParams = [id, firstName, lastName, role, phone, username];

    // Hash password if provided
    if (updateData.password && updateData.password.trim() !== "") {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(updateData.password, saltRounds);

      updateQuery = "CALL updateStaffWithPassword(?, ?, ?, ?, ?, ?, ?)";
      queryParams = [
        id,
        firstName,
        lastName,
        role,
        phone,
        username,
        hashedPassword,
      ];
    }

    // Update staff in database
    await pool.query(updateQuery, queryParams);

    // Get updated staff data
    const [updatedRows] = await pool.query("CALL getStaffById(?)", [id]);
    const updatedStaff =
      updatedRows[0] && updatedRows[0][0] ? updatedRows[0][0] : null;

    // Remove password from response
    const { password, ...staffWithoutPassword } = updatedStaff;

    return NextResponse.json({
      message: "اطلاعات کارمند با موفقیت به‌روزرسانی شد",
      staff: staffWithoutPassword,
    });
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json({ error: "خطای سرور داخلی" }, { status: 500 });
  }
}

// PATCH -> Update staff member status only
export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const { is_active } = await req.json();

    // Validate input
    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "وضعیت باید بولین باشد" },
        { status: 400 }
      );
    }

    // Check if staff member exists
    const [existingStaff] = await pool.query(
      "SELECT staff_id FROM staff WHERE staff_id = ?",
      [id]
    );

    if (existingStaff.length === 0) {
      return NextResponse.json(
        { error: "پرسنل مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Update staff status
    const [result] = await pool.query(
      "UPDATE staff SET is_active = ? WHERE staff_id = ?",
      [is_active, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "خطا در بروزرسانی وضعیت پرسنل" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `پرسنل با موفقیت ${is_active ? "فعال" : "غیرفعال"} شد`,
      id,
      is_active,
    });
  } catch (error) {
    console.error("Error updating staff status:", error);
    return NextResponse.json(
      { error: "خطا در تغییر وضعیت پرسنل" },
      { status: 500 }
    );
  }
}
