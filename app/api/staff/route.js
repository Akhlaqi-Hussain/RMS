import pool from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req) {
  try {
    const { firstName, lastName, username, password, role, phone } =
      await req.json();

    // Hash the password
    const saltRounds = 10; // You can adjust the cost factor
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Call your stored procedure with hashed password
    const [rows] = await pool.query("CALL add_staff(?, ?, ?, ?, ?, ?)", [
      firstName,
      lastName,
      username,
      hashedPassword, // Use hashed password here
      role,
      phone,
    ]);

    const result = rows[0][0];

    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    let query = "CALL getstaff()";

    const [rows] = await pool.query(query);

    // The stored procedure returns results in rows[0]
    const staff = rows[0].map((staff) => ({
      id: staff.staff_id,
      first_name: staff.name,
      last_name: staff.last_name,
      full_name: `${staff.name} ${staff.last_name}`,
      username: staff.username,
      role: staff.role,
      phone: staff.phone,
      active: staff.is_active,
    }));

    return Response.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return Response.json(
      { error: "خطا در دریافت لیست پرسنل" },
      { status: 500 }
    );
  }
}
