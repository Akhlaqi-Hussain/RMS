"use client";

import { useEffect, useState } from "react";
import MenuItemCard from "../menuItemCard";
import { useSidebar } from "@/context/SidebarContext";

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { isSidebarOpen } = useSidebar();

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch("/api/menu");
        if (!res.ok) throw new Error("Failed to fetch menu");
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const handleAddToCart = (item) => {
    console.log("Added to cart:", item);
    // You can later integrate this with your cart context/state
  };

  if (loading) {
    // Skeleton cards for better UX
    return (
      <div
        className={`max-w-6xl mx-auto grid gap-6 sm:grid-cols-2
      ${isSidebarOpen ? "md:grid-cols-2" : "md:grid-cols-3"}
      ${isSidebarOpen ? "lg:grid-cols-3" : "lg:grid-cols-4"}
      ${isSidebarOpen ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 animate-pulse h-50 w-full rounded-2xl shadow-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center py-10 text-red-500">
        خطا در بارگذاری منو: {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center py-10 text-gray-500">
        آیتمی برای نمایش موجود نیست.
      </p>
    );
  }

  return (
    <div className="flex flex-col mx-auto text-center justify-center">
      <div
        className={`max-w-6xl mx-auto lg:p-6 grid gap-6 sm:grid-cols-2
      ${isSidebarOpen ? "md:grid-cols-2" : "md:grid-cols-3"}
      ${isSidebarOpen ? "lg:grid-cols-3" : "lg:grid-cols-4"}
      ${isSidebarOpen ? "xl:grid-cols-4" : "xl:grid-cols-5"}
      lg:grid-cols-3 xl:grid-cols-4`}
      >
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </div>
  );
}
