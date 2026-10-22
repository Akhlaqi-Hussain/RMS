"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  FaBars,
  FaUtensils,
  FaClipboardList,
  FaChevronRight,
  FaChevronLeft,
  FaCog,
  FaSignOutAlt,
  FaTachometerAlt,
  FaPen,
  FaChartBar,
} from "react-icons/fa";

import NavLink from "@/components/sidebar/navLink";
import MobileNavLink from "@/components/sidebar/mobileNavLink";
import { getCurrentUser } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/languageSwitcher";

export default function SidebarLayout({ children }) {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const { t } = useLanguage();

  // Get user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Logout function
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Helper function to check if item should be shown based on user role
  const shouldShowItem = (itemKey) => {
    if (!user) return false;

    const userRole = user.role;

    // Define role-based permissions
    const permissions = {
      // BUG-7: Dashboard and Reports are manager-only (proxy.js and the
      // APIs already refuse other roles), so cashiers no longer see dead links.
      dashboard: ["manager"],
      menu: ["manager", "cashier", "waiter", "chef"],
      orders: ["manager", "cashier", "waiter", "chef"],
      reports: ["manager"],
      manage: ["manager"],
    };

    return permissions[itemKey]?.includes(userRole) || false;
  };

  // Navigation items configuration
  const navItems = [
    {
      href: "/main/dashboard",
      icon: FaTachometerAlt,
      text: t("nav.dashboard"),
      key: "dashboard",
    },
    {
      href: "/main/menu",
      icon: FaUtensils,
      text: t("nav.menu"),
      key: "menu",
    },
    {
      href: "/main/orders",
      icon: FaClipboardList,
      text: t("nav.orders"),
      key: "orders",
    },
    {
      href: "/main/reports",
      icon: FaChartBar,
      text: t("nav.reports"),
      key: "reports",
    },
    {
      href: "/main/manage",
      icon: FaPen,
      text: t("nav.manage"),
      key: "manage",
    },
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) => shouldShowItem(item.key));

  // Role display names in the chosen language
  const getRoleDisplayName = (role) =>
    ["manager", "cashier", "waiter", "chef"].includes(role)
      ? t(`roles.${role}`)
      : role;

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--color-primary)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen bg-gray-50"
      style={{ "--rms-sidebar": isSidebarOpen ? "14rem" : "4rem" }}
    >
      {/* Sidebar (Tablet & Desktop) */}
      <aside
        className={`hidden md:flex fixed top-0 start-0 z-50 h-screen shadow-xl transition-all duration-300 ${
          isSidebarOpen ? "w-56" : "w-16"
        }`}
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-text-on-primary)",
        }}
      >
        <div className="h-full py-6 pt-20 flex flex-col justify-between w-full relative">
          {/* Toggle button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute end-5 top-3 p-1 rounded-full transition-all duration-300 hover:scale-110"
            style={{
              color: "var(--color-text-on-primary)",
              backgroundColor: "var(--color-primary-light)",
            }}
            aria-label={t("nav.toggleSidebar")}
          >
            {isSidebarOpen ? (
              <FaChevronRight className="w-4 h-4 ltr:rotate-180" />
            ) : (
              <FaChevronLeft className="w-4 h-4 ltr:rotate-180" />
            )}
          </button>

          {/* Top section: nav links */}
          <div>
            <ul className="space-y-2 px-2">
              {filteredNavItems.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    icon={item.icon}
                    text={item.text}
                    isSidebarOpen={isSidebarOpen}
                    isActive={pathname === item.href}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom section: Settings & Logout */}
          <div className="px-2 space-y-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 p-3 rounded-xl w-full transition-all duration-300 hover:bg-[color:var(--color-primary-light)_/0.6] hover:shadow-md group"
            >
              <FaSignOutAlt className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              {isSidebarOpen && (
                <span className="text-sm font-medium transition-all duration-300 group-hover:font-semibold">
                  {t("nav.logout")}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="rms-main flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Header */}
        <header className="rms-header fixed top-0 inset-x-0 z-40 backdrop-blur-sm px-3 py-3 sm:p-4 shadow-sm transition-all duration-300 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-2 max-w-full">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-2 rounded-lg transition-all duration-300 hover:bg-gray-100 text-gray-700"
              aria-label={t("nav.openMenu")}
            >
              <FaBars className="w-5 h-5" />
            </button>

            <h1 className="font-bold text-sm sm:text-xl md:text-2xl text-gray-800 transition-all duration-300 text-center flex-1 min-w-0 truncate">
              {t("common.appName")}
            </h1>

            {/* Language + user info */}
            <div className="flex items-center gap-2 shrink-0">
              <LanguageSwitcher />
              {user && (
                <span className="hidden sm:inline text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap">
                  {getRoleDisplayName(user.role)}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div
              className="md:hidden fixed top-0 start-0 h-full w-64 max-w-[85vw] shadow-xl z-50 transition-transform duration-300"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-text-on-primary)",
              }}
            >
              <div className="h-full py-6 pt-20 flex flex-col justify-between">
                {/* Close button */}
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="absolute end-4 top-4 p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition-colors"
                  aria-label={t("nav.closeMenu")}
                >
                  <FaChevronRight className="w-4 h-4 ltr:rotate-180" />
                </button>

                {/* Navigation items */}
                <ul className="space-y-2 px-3 flex-1">
                  {filteredNavItems.map((item) => (
                    <li key={item.href}>
                      <MobileNavLink
                        href={item.href}
                        icon={item.icon}
                        text={item.text}
                        onClick={() => setIsMobileSidebarOpen(false)}
                        isActive={pathname === item.href}
                      />
                    </li>
                  ))}
                </ul>

                {/* Role + logout on phones (the desktop sidebar has its own logout) */}
                <div className="px-3 space-y-2">
                  {user && (
                    <p className="text-xs opacity-80 px-2">
                      {getRoleDisplayName(user.role)}
                    </p>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-2 rounded-lg w-full transition-all duration-300 hover:bg-[color:var(--color-primary-light)_/0.6]"
                  >
                    <FaSignOutAlt className="w-5 h-5" />
                    <span className="text-sm font-medium">{t("nav.logout")}</span>
                  </button>
                </div>


              </div>
            </div>
          </>
        )}

        {/* Page content */}
        <main className="flex-1 mt-16 p-2 sm:p-4 md:p-6 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 w-full overflow-hidden">
            <div className="w-full max-w-full overflow-x-auto">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
