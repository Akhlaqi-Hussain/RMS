"use client";
import { useState } from "react";
import { FaUtensils, FaUsers, FaDatabase } from "react-icons/fa";
import PageContainer from "@/components/pageContainer";
import { useLanguage } from "@/context/LanguageContext";

// Import management pages
import MenuManagementPage from "./menu/menuManagementPage";
import StaffManagementPage from "./staff/staffManagementPage";
import TableManagementPage from "./table/tableManagementPage";
import BackupManagementPage from "./backup/backupManagementPage";

export default function ManagePage() {
  const [activeTab, setActiveTab] = useState("menu");
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex w-full sm:inline-flex sm:w-auto rounded-lg overflow-hidden border border-gray-300">
        <button
          onClick={() => setActiveTab("menu")}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 sm:px-6 py-2 text-sm sm:text-base transition-all ${
            activeTab === "menu"
              ? "bg-[color:var(--color-primary)] text-white"
              : "bg-[color:var(--color-primary-light)] hover:bg-[color:var(--color-primary)] hover:text-white"
          }`}
        >
          <FaUtensils className="w-4 h-4" />
          <span>{t("manage.tabMenu")}</span>
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 sm:px-6 py-2 text-sm sm:text-base transition-all ${
            activeTab === "staff"
              ? "bg-[color:var(--color-primary)] text-white"
              : "bg-[color:var(--color-primary-light)] hover:bg-[color:var(--color-primary)] hover:text-white"
          }`}
        >
          <FaUsers className="w-4 h-4" />
          <span>{t("manage.tabStaff")}</span>
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 sm:px-6 py-2 text-sm sm:text-base transition-all ${
            activeTab === "tables"
              ? "bg-[color:var(--color-primary)] text-white"
              : "bg-[color:var(--color-primary-light)] hover:bg-[color:var(--color-primary)] hover:text-white"
          }`}
        >
          <FaUsers className="w-4 h-4" />
          <span>{t("manage.tabTables")}</span>
        </button>
        {/* BACKUP-3 */}
        <button
          onClick={() => setActiveTab("backup")}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 sm:px-6 py-2 text-sm sm:text-base transition-all ${
            activeTab === "backup"
              ? "bg-[color:var(--color-primary)] text-white"
              : "bg-[color:var(--color-primary-light)] hover:bg-[color:var(--color-primary)] hover:text-white"
          }`}
        >
          <FaDatabase className="w-4 h-4" />
          <span>{t("manage.tabBackup")}</span>
        </button>
      </div>

      {/* Content */}
      <PageContainer>
        {activeTab === "menu" && <MenuManagementPage />}
        {activeTab === "staff" && <StaffManagementPage />}
        {activeTab === "tables" && <TableManagementPage />}
        {activeTab === "backup" && <BackupManagementPage />}
      </PageContainer>
    </div>
  );
}
