"use client";
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardPage() {
  const { t } = useLanguage();
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("home.welcome")}</h2>
      <p>{t("home.text")}</p>
    </div>
  );
}
