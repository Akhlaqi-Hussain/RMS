"use client";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/pageContainer";
import toast from "react-hot-toast";
import { printKitchenBill } from "@/utils/printBill";
import { FaShoppingCart, FaUtensils, FaPlus, FaReceipt } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const [orderType, setOrderType] = useState("new");
  const [tableId, setTableId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showOrderId, setShowOrderId] = useState(false);
  const router = useRouter();
  const { t, tServer, locale, formatMoney, formatNumber } = useLanguage();

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await fetch("/api/tables");
        if (!res.ok) throw new Error("Failed to fetch tables");
        const data = await res.json();
        setTables(data);
      } catch (err) {
        console.error("Error fetching Tables: ", err);
      }
    };
    fetchTables();
  }, []);

  // Fetch orders based on table_id for adding to order
  useEffect(() => {
    const fetchOrders = async () => {
      if (orderType === "existing" && tableId) {
        try {
          const res = await fetch(`/api/orders/by-table?table_id=${tableId}`);
          if (!res.ok) throw new Error("Failed to fetch orders");
          const data = await res.json();
          setOrders(data);
        } catch (err) {
          console.error("Error fetching Orders: ", err);
        }
      } else {
        setOrders([]);
        setOrderId("");
      }
    };
    fetchOrders();
  }, [orderType, tableId]);

  // Show/hide order ID field based on order type
  useEffect(() => {
    setShowOrderId(orderType === "existing");
  }, [orderType]);

  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error(t("checkout.emptyCart"));
      return;
    }

    setSubmitting(true);

    const payload = {
      table_id: tableId,
      notes,
      items: cartItems.map((item) => ({
        menu_item_id: item.id,
        qty: item.quantity,
        price: item.price,
        name: item.name,
      })),
    };

    try {
      let res;
      if (orderType === "new") {
        // Create new order
        res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Add items to existing order
        res = await fetch(`/api/orders/${orderId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            table_id: tableId,
            notes,
            items: cartItems.map((item) => ({
              menu_item_id: item.id,
              qty: item.quantity,
              price: item.price,
            })),
          }),
        });
      }

      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        console.error("Order error:", data.error);
        toast.error(tServer(data.error, "checkout.createFailed"));
        return;
      }

      toast.success(t("checkout.created"));

      // Print kitchen bill for new orders
      if (orderType === "new" && data.order) {
        printKitchenBill(data.order, cartItems, locale);
      }

      clearCart();
      router.push("/main/orders");
    } catch (err) {
      console.error("Error:", err);
      toast.error(t("common.networkError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title={t("checkout.title")}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 relative">
        {/* Left Column - Order Summary */}
        <div className="space-y-6">
          <div className="md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[color:var(--color-primary)] text-white p-3 rounded-xl">
                <FaReceipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t("checkout.detailsTitle")}
                </h2>
                <p className="text-gray-500 text-sm">
                  {t("checkout.detailsSubtitle")}
                </p>
              </div>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaShoppingCart className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">
                  {t("checkout.emptyCart")}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {t("checkout.emptyCartHint")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Order Items Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto transition-all duration-200 hover:shadow-md">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-start">
                          {t("checkout.colItem")}
                        </th>
                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-center">
                          {t("checkout.colQty")}
                        </th>
                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-end">
                          {t("checkout.colUnitPrice")}
                        </th>
                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-end">
                          {t("common.total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className="border-b hover:bg-gray-50 transition-colors"
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: " 0.5s ease-out forwards",
                          }}
                        >
                          <td className="py-3 px-2 sm:px-4 font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-center">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                              {formatNumber(item.quantity)}
                            </span>
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-gray-600 text-end whitespace-nowrap">
                            {formatMoney(item.price)}
                          </td>
                          <td className="py-3 px-2 sm:px-4 font-semibold text-[color:var(--color-primary)] text-end whitespace-nowrap">
                            {formatMoney(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Price Section */}
                <div className="bg-[#E6F4F1] p-4 rounded-lg border-s-4 border-[color:var(--color-primary-light)] transition-all duration-200 hover:scale-[1.02]">
                  <p className="text-sm text-[color:var(--color-primary-light)] mb-1">
                    {t("checkout.amountDue")}
                  </p>
                  <p className="font-bold text-2xl text-[color:var(--color-primary-light)]">
                    {formatMoney(totalPrice)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push("/main/menu")}
                    className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200 active:scale-95"
                  >
                    {t("checkout.backToMenu")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="hidden lg:block absolute inset-y-0 start-1/2 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

        {/* Right Column - Order Information */}
        <div className="space-y-6">
          <div className="md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t("checkout.infoTitle")}</h2>
            </div>

            {/* Order Type Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("checkout.orderType")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType("new")}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 active:scale-95 ${
                    orderType === "new"
                      ? "border-[color:var(--color-primary)] bg-blue-50 text-[color:var(--color-primary)] font-semibold"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:scale-105"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">🆕</div>
                    <div className="text-sm">{t("checkout.newOrder")}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType("existing")}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 active:scale-95 ${
                    orderType === "existing"
                      ? "border-green-500 bg-green-50 text-green-600 font-semibold"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:scale-105"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">
                      <FaPlus className="w-4 h-4 mx-auto" />
                    </div>
                    <div className="text-sm">{t("checkout.addToExisting")}</div>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Table Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("checkout.tableNumber")}
                </label>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 transition-all duration-200"
                  required
                >
                  <option value="">{t("checkout.chooseTable")}</option>
                  {tables.length > 0 ? (
                    tables.map((table) => (
                      <option key={table.table_id} value={table.table_id}>
                        {t("common.tableNo", { no: table.table_no })}
                      </option>
                    ))
                  ) : (
                    <option disabled>{t("common.loading")}</option>
                  )}
                </select>
              </div>

              {/* Order ID - only for existing orders */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  showOrderId ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("checkout.orderId")}
                </label>
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                  required={orderType === "existing"}
                >
                  <option value="">{t("checkout.chooseOrder")}</option>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <option key={order.order_id} value={order.order_id}>
                        {t("common.orderNo", { id: order.order_id })}
                      </option>
                    ))
                  ) : (
                    <option disabled>
                      {tableId
                        ? t("checkout.noOrders")
                        : t("checkout.chooseTableFirst")}
                    </option>
                  )}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("checkout.notes")}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 transition-all duration-200 resize-none"
                  rows={3}
                  placeholder={t("checkout.notesPlaceholder")}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={cartItems.length === 0 || submitting}
                className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 active:scale-95 ${
                  cartItems.length === 0 || submitting
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-light)] hover:scale-105 text-white"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2 opacity-70">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("checkout.submitting")}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <FaUtensils className="w-4 h-4" />
                    {t("checkout.submit")}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
