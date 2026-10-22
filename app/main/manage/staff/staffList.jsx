"use client";
import { useLanguage } from "@/context/LanguageContext";

export default function StaffList({ staff, onEdit, onDelete, onToggleStatus }) {
  const { t } = useLanguage();
  if (!staff.length) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <p className="text-gray-500 text-lg font-medium">
            {t("manageStaff.emptyTitle")}
          </p>
          <p className="text-gray-400 mt-2">
            {t("manageStaff.emptyHint")}
          </p>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cashier":
        return "bg-green-100 text-green-800 border-green-200";
      case "waiter":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "chef":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case "admin":
        return t("roles.admin");
      case "manager":
        return t("roles.manager");
      case "cashier":
        return t("roles.cashier");
      case "waiter":
        return t("roles.waiter");
      case "chef":
        return t("roles.chef");
      default:
        return role;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-50/80 border-b border-gray-200">
            <tr>
              <th className="px-3 sm:px-6 py-4 text-start text-sm font-semibold text-gray-700 whitespace-nowrap">
                {t("manageStaff.colStaff")}
              </th>
              <th className="px-3 sm:px-6 py-4 text-start text-sm font-semibold text-gray-700 whitespace-nowrap">
                {t("manageStaff.colRole")}
              </th>
              <th className="px-3 sm:px-6 py-4 text-start text-sm font-semibold text-gray-700 whitespace-nowrap">
                {t("common.status")}
              </th>
              <th className="px-3 sm:px-6 py-4 text-start text-sm font-semibold text-gray-700 whitespace-nowrap">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map((staffMember, index) => (
              <tr
                key={staffMember.id}
                className="hover:bg-gray-50/50 transition-colors duration-150"
              >
                <td className="px-3 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {staffMember.full_name}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        {staffMember.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getRoleBadgeColor(
                      staffMember.role
                    )}`}
                  >
                    {getRoleText(staffMember.role)}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4">
                  <button
                    onClick={() =>
                      onToggleStatus(staffMember.id, staffMember.active)
                    }
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      staffMember.active
                        ? "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200"
                        : "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200"
                    }`}
                  >
                    {staffMember.active ? t("common.active") : t("common.inactive")}
                  </button>
                </td>
                <td className="px-3 sm:px-6 py-4">
                  <button
                    onClick={() => onEdit(staffMember)}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium text-sm transition-all duration-200 hover:shadow-sm"
                  >
                    {t("common.edit")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
