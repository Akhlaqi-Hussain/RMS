"use client";
import { useEffect, useState } from "react";
import { FaShoppingCart, FaSearch } from "react-icons/fa";
import MenuItemCard from "@/components/menuItemCard";
import { useSidebar } from "@/context/SidebarContext";
import { useCart } from "@/context/CartContext";
import Cart from "@/components/cart";
import { useLanguage } from "@/context/LanguageContext";

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const { isSidebarOpen } = useSidebar();
  const { cartCount } = useCart();
  const { t } = useLanguage();

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error(t("menu.categoriesFailed"));
        const data = await res.json();
        setCategories(data);
        // Select first category by default
        if (data.length > 0 && !selectedCategory) {
          setSelectedCategory(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      }
    }
    fetchCategories();
  }, []);

  // Fetch menu items whenever category changes
  useEffect(() => {
    async function fetchMenuItems() {
      setLoading(true);
      try {
        const url = selectedCategory
          ? `/api/menu?categoryId=${selectedCategory}`
          : "/api/menu";
        const res = await fetch(url);
        if (!res.ok) throw new Error(t("menu.itemsFailed"));
        const data = await res.json();
        setMenuItems(data);
        setFilteredItems(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (selectedCategory !== null) {
      fetchMenuItems();
    }
  }, [selectedCategory]);

  // Filter and sort items
  useEffect(() => {
    let result = [...menuItems];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(result);
  }, [menuItems, searchTerm, sortBy]);

  return (
    <div className="space-y-6 min-h-screen">
      {/* Cart Button */}
      <button
        className="fixed top-1/2 end-0 -translate-y-1/2 bg-[color:var(--color-primary)] text-white p-3 sm:p-4 rounded-s-full shadow-lg hover:bg-[color:var(--color-primary-light)] transition-colors z-50 flex items-center justify-center"
        onClick={() => setCartOpen(true)}
        aria-label={t("cart.open")}
      >
        <FaShoppingCart size={24} />
        <span className="absolute -top-1 -start-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {cartCount}
        </span>
      </button>
      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Search and Filter Bar */}
      <div className="p-4">
        <h1 className="text-3xl text-center md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
          {t("menu.title")}
        </h1>
        <div className="flex justify-center gap-2 max-w-md mx-auto">
          {/* Search Input */}
          <div className="relative w-full max-w-md">
            <FaSearch className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("menu.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-12 pe-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Category buttons */}
      <div className="w-full overflow-x-auto flex sm:justify-center px-1">
        <div className="inline-flex shrink-0 rounded-lg overflow-hidden border border-gray-300">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs md:text-base px-4 py-2 whitespace-nowrap transition-all duration-300
          ${
            selectedCategory === cat.id
              ? "bg-[color:var(--color-primary-light)] text-[color:var(--color-accent)] shadow-md"
              : "bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)] text-white"
          }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Error */}
        {error && <p className="text-center py-10 text-red-500">{error}</p>}

        {/* Loading skeleton */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--color-primary)]"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-center py-10 text-gray-500">
            {searchTerm
              ? t("menu.noResults")
              : t("menu.noItems")}
          </p>
        ) : (
          <div className="flex flex-col mx-auto text-center justify-center">
            {/* Grid Layout */}
            <div
              className={`w-full max-w-6xl mx-auto grid gap-3 sm:gap-6 grid-cols-2
            ${isSidebarOpen ? "md:grid-cols-2" : "md:grid-cols-3"}
            ${isSidebarOpen ? "lg:grid-cols-3" : "lg:grid-cols-4"}
            ${isSidebarOpen ? "xl:grid-cols-4" : "xl:grid-cols-5"}
            ${isSidebarOpen ? "2xl:grid-cols-5" : "2xl:grid-cols-5"}`}
            >
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
