"use client";
import Link from "next/link";

export default function NavLink({
  href,
  icon: Icon,
  text,
  isSidebarOpen,
  onClick,
  isActive,
  className = "",
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group ${className} ${
        isActive
          ? "bg-[color:var(--color-primary-light)] shadow-md"
          : "hover:bg-[color:var(--color-primary-light)_/0.6]"
      }`}
      onClick={onClick}
    >
      <Icon
        className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
        style={{ color: "var(--color-accent)" }}
      />
      {isSidebarOpen && (
        <span className="text-sm font-medium transition-all duration-300 group-hover:font-semibold">
          {text}
        </span>
      )}
    </Link>
  );
}
