import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req) {
  try {
    const { reportType, startDate, endDate } = await req.json();

    if (!reportType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing reportType, startDate, or endDate" },
        { status: 400 }
      );
    }

    // Map frontend types to stored procedure names
    const procedureMap = {
      sales: "getSalesReport",
      products: "getProductPerformanceReport",
      financial: "getFinancialReport",
      orders: "getOrdersReport",
    };

    const procedureName = procedureMap[reportType];

    if (!procedureName) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      );
    }

    console.log(`CALL ${procedureName}('${startDate}', '${endDate}')`);
    // Execute the stored procedure
    const [rows] = await pool.query(`CALL ${procedureName}(?, ?)`, [
      startDate,
      endDate,
    ]);

    // Some DBs wrap results, especially with CALL
    const data = Array.isArray(rows) ? rows[0] || [] : [];

    return NextResponse.json({ success: true, reportType, data });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: error.message },
      { status: 500 }
    );
  }
}
