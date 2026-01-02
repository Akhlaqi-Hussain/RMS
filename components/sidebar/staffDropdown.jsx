"use client";
import Link from "next/link";
import { FaUsers, FaChevronDown, FaPlus, FaUserEdit } from "react-icons/fa";

export default function StaffDropdown({
  isSidebarOpen,
  isStaffDropdownOpen,
  setIsStaffDropdownOpen,
  isStaffActive,
  isMobile = false,
  onItemClick,
}) {
  return (
    <div className={`${isMobile ? "" : "relative"}`}>
      <button
        onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
        className={`flex items-center justify-between w-full gap-4 p-3 rounded-xl transition-all duration-300 group ${
          isStaffActive
            ? "bg-[color:var(--color-primary-light)] shadow-md"
            : "hover:bg-[color:var(--color-primary-light)_/0.6]"
        }`}
      >
        <div className="flex items-center gap-4">
          <FaUsers
            className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
            style={{ color: "var(--color-accent)" }}
          />
          {isSidebarOpen && (
            <span className="text-sm font-medium transition-all duration-300 group-hover:font-semibold">
              کارکنان
            </span>
          )}
        </div>
        {isSidebarOpen && (
          <FaChevronDown
            className={`w-3 h-3 transition-transform duration-300 ${
              isStaffDropdownOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isSidebarOpen && isStaffDropdownOpen && (
        <div
          className={`mt-1 ${
            isMobile ? "mr-4" : "ml-4"
          } bg-[color:var(--color-primary-light)] rounded-lg overflow-hidden shadow-lg`}
        >
          <Link
            href="/main/staff/add"
            className="flex items-center gap-3 p-2 transition-all duration-300 hover:bg-[color:var(--color-primary)_/0.8]"
            onClick={() => onItemClick()}
          >
            <FaPlus className="w-4 h-4" />
            <span className="text-sm">افزودن کارمند</span>
          </Link>
          <Link
            href="/main/staff/manage"
            className="flex items-center gap-3 p-2 transition-all duration-300 hover:bg-[color:var(--color-primary)_/0.8]"
            onClick={() => onItemClick()}
          >
            <FaUserEdit className="w-4 h-4" />
            <span className="text-sm">مدیریت کارکنان</span>
          </Link>
        </div>
      )}
    </div>
  );
}
