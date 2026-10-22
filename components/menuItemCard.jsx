"use client";
import React, { useState } from "react";
import Image from "next/image";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

const MenuItemCard = ({ item }) => {
  const [imageError, setImageError] = useState(false);
  const { addToCart } = useCart();
  const { t, formatMoney } = useLanguage();

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="group bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl w-full flex flex-col">
      {/* Image Container */}
      <div className="relative h-28 w-full overflow-hidden">
        <Image
          src={`${item.image}?v=${item.updatedAt || Date.now()}`}
          alt={item.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={handleImageError}
          unoptimized
        />

        {/* 💰 Price Tag */}
        <span
          className="absolute top-2 start-2 px-2 sm:px-3 py-1 text-xs font-bold rounded-full shadow-md"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-text-on-primary)",
          }}
        >
          {formatMoney(item.price)}
        </span>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5 flex flex-col flex-grow">
        <h3 className="text-md font-bold text-gray-900 line-clamp-1 mb-2">
          {item.name}
        </h3>

        {/* Add to Cart Button */}
        <button
          onClick={() => addToCart(item)} // ⬅️ direct call
          className="flex items-center justify-center gap-2 font-semibold py-2 rounded-full transition-all duration-200 mt-auto 
          bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-light)] "
          style={{
            color: "var(--color-text-on-primary)",
          }}
        >
          <FaShoppingCart className="w-5 h-5" />
          {t("menu.addToCart")}
        </button>
      </div>
    </div>
  );
};

export default MenuItemCard;
