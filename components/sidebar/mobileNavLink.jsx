"use client";
import Link from "next/link";

export default function MobileNavLink({
  href,
  icon: Icon,
  text,
  onClick,
  isActive,
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
        isActive
          ? "bg-[color:var(--color-primary-light)] shadow-md"
          : "hover:bg-[color:var(--color-primary-light)_/0.6]"
      }`}
    >
      <Icon
        className="w-5 h-5 transition-transform duration-300 hover:scale-110"
        style={{ color: "var(--color-accent)" }}
      />
      <span className="text-sm font-medium transition-all duration-300 hover:font-semibold">
        {text}
      </span>
    </Link>
  );
}
