"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaSearch, FaClock, FaUser, FaReceipt, FaTable } from "react-icons/fa";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [lastSearch, setLastSearch] = useState("");
  const router = useRouter();

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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fa-IR");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[color:var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری سفارش‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
            مدیریت سفارش‌ها
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex justify-center">
            <div className="relative w-full max-w-md transition-all duration-300 hover:scale-105">
              <FaSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="جستجو با شماره سفارش..."
                className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 transition-all duration-200"
              />
            </div>
          </form>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {orders.map((order, index) => (
            <div
              key={order.order_id}
              className="transition-all duration-300 hover:-translate-y-1 hover:scale-105 active:scale-95"
              style={{
                animationDelay: `${index * 100}ms`,
                animation: " 0.5s ease-out forwards",
              }}
            >
              <Link
                href={`/main/orders/${order.order_id}`}
                className="block bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group"
              >
                <div className="p-6">
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-[color:var(--color-primary)] text-white p-2 rounded-lg">
                        <FaReceipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          سفارش #{order.order_id}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <FaTable className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            میز {order.table_no}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                        <FaClock className="w-3 h-3" />
                        <span>{order.created_at}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FaUser className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 font-medium">
                          گارسون:
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
                        order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {order.status === "completed"
                        ? "تکمیل شده"
                        : order.status === "open"
                        ? "فعال"
                        : "منسوخ"}
                    </span>
                    <div className="text-[color:var(--color-primary)] text-sm font-medium group-hover:underline transition-all duration-200">
                      مشاهده جزئیات →
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
                سفارشی وجود ندارد
              </h3>
              <p className="text-gray-600 mb-6">
                در حال حاضر هیچ سفارش فعالی در سیستم ثبت نشده است.
              </p>
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 transition-all duration-300 hover:bg-gray-100">
                برای ایجاد سفارش جدید به بخش سفارش‌گیری مراجعه کنید.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
