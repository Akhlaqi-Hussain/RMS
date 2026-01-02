export default function TableList({
  tables,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  if (!tables.length) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
          <div className="text-gray-400 text-6xl mb-4">🪑</div>
          <p className="text-gray-500 text-lg font-medium">هیچ میزی پیدا نشد</p>
          <p className="text-gray-400 mt-2">برای شروع، میز جدیدی اضافه کنید</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-50/80 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                شماره میز
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                وضعیت
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                عملیات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tables.map((table) => (
              <tr
                key={table.table_id}
                className="hover:bg-gray-50/50 transition-colors duration-150"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        میز {table.table_no}
                      </h3>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() =>
                      onToggleStatus(table.table_id, table.is_active)
                    }
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      table.is_active
                        ? "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200"
                        : "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200"
                    }`}
                  >
                    {table.is_active ? "فعال" : "غیرفعال"}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(table)}
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium text-sm transition-all duration-200 hover:shadow-sm hover:scale-105"
                    >
                      ادیت
                    </button>
                    <button
                      onClick={() => onDelete(table.table_id)}
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-medium text-sm transition-all duration-200 hover:shadow-sm hover:scale-105"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-200 text-center">
        <span className="text-sm text-gray-500">
          نمایش {tables.length} از {tables.length} میز
        </span>
      </div>
    </div>
  );
}
