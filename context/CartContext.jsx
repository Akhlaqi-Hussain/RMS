"use client";
import { createContext, useContext, useState } from "react";

// Create context
const CartContext = createContext();

// Hook for easy usage
export function useCart() {
  return useContext(CartContext);
}

// Provider
export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Add item
  const addToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // Remove item
  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update quantity (increase or decrease)
  const updateQuantity = (id, quantity) => {
    if (quantity < 1) return; // don't allow less than 1
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  // Clear cart
  const clearCart = () => setCartItems([]);

  // Count total items
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Context value
  const value = {
    cartItems,
    cartCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
