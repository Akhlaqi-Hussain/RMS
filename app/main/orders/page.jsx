"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaSearch, FaClock, FaUser, FaReceipt, FaTable } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [lastSearch, setLastSearch] = useState("");
  const router = useRouter();
  const { t, formatDateTime } = useLanguage();

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const res = await fetch("/api/orders");
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedId = searchOrderId.trim();

    if (trimmedId !== "" && trimmedId !== lastSearch) {
      setLastSearch(trimmedId);
      router.push(`/main/orders/${trimmedId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[color:var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-600">{t("orders.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-1 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
            {t("orders.title")}
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex justify-center">
            <div className="relative w-full max-w-md transition-all duration-300 sm:hover:scale-105">
              <FaSearch className="absolute start-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder={t("orders.searchPlaceholder")}
                className="w-full ps-12 pe-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 transition-all duration-200"
              />
            </div>
          </form>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {orders.map((order, index) => (
            <div
              key={order.order_id}
              className="transition-all duration-300 hover:-translate-y-1 sm:hover:scale-105 active:scale-95"
              style={{
                animationDelay: `${index * 100}ms`,
                animation: " 0.5s ease-out forwards",
              }}
            >
              <Link
                href={`/main/orders/${order.order_id}`}
                className="block bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group"
              >
                <div className="p-4 sm:p-6">
                  {/* Order Header */}
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-[color:var(--color-primary)] text-white p-2 rounded-lg">
                        <FaReceipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {t("common.orderNo", { id: order.order_id })}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <FaTable className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {t("common.tableNo", { no: order.table_no })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-end">
                      <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                        <FaClock className="w-3 h-3" />
                        <span>{formatDateTime(order.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FaUser className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 font-medium">
                          {t("orders.waiter")}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {order.waiter}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4 flex justify-between items-center">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        // BUG-11: the database uses open / closed / cancelled
                        order.status === "closed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {order.status === "closed"
                        ? t("orders.statusPaid")
                        : order.status === "cancelled"
                        ? t("orders.statusCancelled")
                        : order.status === "open"
                        ? t("orders.statusOpen")
                        : t("orders.statusOther")}
                    </span>
                    <div className="text-[color:var(--color-primary)] text-sm font-medium group-hover:underline transition-all duration-200">
                      {t("orders.viewDetails")}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {orders.length === 0 && !loading && (
          <div className="text-center py-16 animate-fade-in">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-300 hover:scale-110">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {t("orders.emptyTitle")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("orders.emptyText")}
              </p>
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 transition-all duration-300 hover:bg-gray-100">
                {t("orders.emptyHint")}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
