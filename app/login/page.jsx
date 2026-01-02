"use client";
import React from "react";
import Login from "@/components/login";
import toast from "react-hot-toast";

const LoginPage = () => {
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
        const message =
          data?.message ||
          "ورود ناموفق بود. لطفاً نام کاربری و رمز عبور خود را بررسی کنید.";
        toast.error(message);
        console.error("Login failed:", message);
        return;
      }

      toast.success("ورود موفقیت‌آمیز بود!");
      window.location.href = "/main/dashboard"; // Redirect to dashboard or protected page
    } catch (err) {
      console.error("Login error:", err);
      toast.error("خطایی در سرور رخ داد. لطفاً دوباره تلاش کنید.");
    }
  };

  return (
    <div>
      <Login onSubmit={handleLogin} />
    </div>
  );
};

export default LoginPage;
