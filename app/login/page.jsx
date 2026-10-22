"use client";
import React from "react";
import Login from "@/components/login";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";

const LoginPage = () => {
  const { t, tServer } = useLanguage();

  const handleLogin = async (formData) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Show relevant error message from backend if available
        const message = data?.message
          ? tServer(data.message)
          : t("login.failed");
        toast.error(message);
        console.error("Login failed:", message);
        return;
      }

      toast.success(t("login.success"));
      window.location.href = "/main/dashboard"; // Redirect to dashboard or protected page
    } catch (err) {
      console.error("Login error:", err);
      toast.error(t("common.networkError"));
    }
  };

  return (
    <div>
      <Login onSubmit={handleLogin} />
    </div>
  );
};

export default LoginPage;
