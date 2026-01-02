"use client";
import { useState } from "react";
import { FaUtensils, FaUsers } from "react-icons/fa";
import PageContainer from "@/components/pageContainer";

// Import management pages
import MenuManagementPage from "./menu/menuManagementPage";
import StaffManagementPage from "./staff/staffManagementPage";
import TableManagementPage from "./table/tableManagementPage";

export default function ManagePage() {
  const [activeTab, setActiveTab] = useState("menu");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="inline-flex rounded-lg overflow-hidden border border-gray-300">
        <button
          onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-2 px-6 py-2 transition-all ${
            activeTab === "menu"
              ? "bg-[color:var(--color-primary)] text-white"
              : "bg-[color:var(--color-primary-light)] hover:bg-[color:var(--color-primary)] hover:text-white"
          }`}
        >
          <FaUtensils className="w-4 h-4" />
          <span>منو</span>
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-6 py-2 transition-all ${
            activeTab === "staff"
              ? "bg-[color:var(--color-primary)] text-white"
              : "bg-[color:var(--color-primary-light)] hover:bg-[color:var(--color-primary)] hover:text-white"
          }`}
        >
          <FaUsers className="w-4 h-4" />
          <span>کارکنان</span>
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={`flex items-center gap-2 px-6 py-2 transition-all ${
            activeTab === "tables"
              ? "bg-[color:var(--color-primary)] text-white"
              : "bg-[color:var(--color-primary-light)] hover:bg-[color:var(--color-primary)] hover:text-white"
          }`}
        >
          <FaUsers className="w-4 h-4" />
          <span>میزها</span>
        </button>
      </div>

      {/* Content */}
      <PageContainer>
        {activeTab === "menu" && <MenuManagementPage />}
        {activeTab === "staff" && <StaffManagementPage />}
        {activeTab === "tables" && <TableManagementPage />}
      </PageContainer>
    </div>
  );
}
