"use client";

import React from "react";

const DataTable = ({
  data,
  columns,
  title = "",
  emptyMessage = "داده‌ای برای نمایش وجود ندارد",
  loading = false,
  className = "",
  onPrint,
  showTotalsRow = true, // show/hide totals
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <></>;
  }

  const summableKeys = [
    "total_orders",
    "total_sales",
    "total_discount",
    "net_sales",
    "total_qty",
    "net_income",
    "total_amount",
  ];

  const totals = {};
  summableKeys.forEach((key) => {
    totals[key] = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
  });

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className} mt-8`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-xl font-bold">{title}</h3>
        {onPrint && (
          <button
            onClick={onPrint}
            className="bg-[color:var(--color-primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[color:var(--color-primary-light)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            چاپ گزارش
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" dir="rtl">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-50/80 border-b border-gray-200">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  className="px-6 py-4 text-right text-sm font-semibold text-gray-700"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-gray-50/50 transition-colors duration-150"
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}

            {showTotalsRow && (
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {colIndex === 0
                      ? "مجموع"
                      : summableKeys.includes(column.key)
                      ? column.render
                        ? column.render(totals[column.key])
                        : totals[column.key].toLocaleString()
                      : ""}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
