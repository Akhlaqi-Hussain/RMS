"use client";
import { useEffect, useState } from "react";

export default function OrderDetails({ orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch order details
  useEffect(() => {
    async function fetchOrderDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error("Failed to fetch order details");
        const data = await res.json();
        setOrder(data.order);
        setItems(data.items);
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setLoading(false);
      }
    }
    if (orderId) fetchOrderDetails();
  }, [orderId]);

  // Close modal with Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!orderId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-l from-gray-50 to-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              جزئیات سفارش #{orderId}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content: Two Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 text-center text-gray-500">
              در حال بارگذاری...
            </div>
          ) : (
            <>
              {/* Left Column - Order Summary */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">شماره میز</p>
                  <p className="font-bold text-gray-900">{order?.table_no}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">گارسون</p>
                  <p className="font-bold text-gray-900">{order?.waiter}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">زمان سفارش</p>
                  <p className="font-bold text-gray-900">{order?.order_time}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border-r-4 border-orange-500">
                  <p className="text-sm text-orange-600 mb-1">
                    مبلغ قابل پرداخت
                  </p>
                  <p className="font-bold text-2xl text-orange-700">
                    {(order?.total_amount || 0).toLocaleString()} ؋
                  </p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-red-600">وضعیت: پرداخت نشده</p>
                </div>
              </div>

              {/* Right Column - Items List */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  آیتم‌های سفارش
                </h3>
                {items.length === 0 ? (
                  <p className="text-gray-500">هیچ آیتمی ثبت نشده است.</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <li key={item.id} className="py-3 flex justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.menu_item}
                          </p>
                          <p className="text-sm text-gray-500">
                            تعداد: {item.qty} × {item.price.toLocaleString()} ؋
                          </p>
                        </div>
                        <p className="font-bold text-gray-900">
                          {item.total_price.toLocaleString()} ؋
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-xl font-medium hover:bg-gray-400 transition-colors"
            >
              بستن
            </button>
            <button
              onClick={() => onCancel(orderId)}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              لغو سفارش
            </button>
            <button
              onClick={() => onPayment(orderId)}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              تایید پرداخت
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
