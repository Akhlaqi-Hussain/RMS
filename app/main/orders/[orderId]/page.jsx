"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/components/pageContainer";
import toast from "react-hot-toast";
import { printCustomerBill, printKitchenBill } from "@/utils/printBill";
import { useLanguage } from "@/context/LanguageContext";

function getOrderDetails(orderId) {
  return fetch(`/api/orders/${orderId}`).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch order details");
    return res.json();
  });
}

export default function OrderDetailsPage() {
  const params = useParams();
  const { orderId } = params;
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [total, setTotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const { t, tServer, locale, formatMoney, formatNumber, formatDate, formatDateTime } =
    useLanguage();

  // Puts the order data from the server on the screen (used by the first load
  // and by every refresh after cancel / payment / edit).
  const showOrderDetails = useCallback((data) => {
    console.log(data);

    setOrder(data.order);
    setItems(data.items || []);
    setBill(data.bill || null);
    setRole(data.role);

    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );
    setTotal(totalAmount);
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      showOrderDetails(await getOrderDetails(orderId));
    } catch (err) {
      console.error("Error fetching order details:", err);
      toast.error(t("orderDetails.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // LINT-1: first load. The order is shown when the answer arrives
  // (no state change directly inside the effect).
  useEffect(() => {
    if (!orderId) return;
    let active = true;
    getOrderDetails(orderId)
      .then((data) => {
        if (active) showOrderDetails(data);
      })
      .catch((err) => {
        console.error("Error fetching order details:", err);
        if (active) toast.error(t("orderDetails.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, t, showOrderDetails]);

  const handleCancel = async () => {
    if (cancelLoading) return;
    setCancelLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to cancel order");

      const data = await res.json();
      fetchOrderDetails();
      toast.success(t("orderDetails.cancelled"));
    } catch (err) {
      console.error(err);
      toast.error(t("orderDetails.cancelFailed"));
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePaymentConfirm = () => {
    // Validate discount amount
    if (discount > total) {
      toast.error(t("orderDetails.discountTooHigh"));
      return;
    }

    if (discount < 0) {
      toast.error(t("orderDetails.discountNegative"));
      return;
    }

    setShowPaymentConfirm(true);
  };

  const handlePayment = async () => {
    if (paymentLoading) return;
    setPaymentLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          subtotal: total,
          discount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(tServer(data.error, "orderDetails.paymentFailed"));

      fetchOrderDetails();
      setShowPaymentConfirm(false);

      if (data.message) {
        toast.success(t("orderDetails.paymentConfirmed"));
      } else if (data.war) {
        toast.error(tServer(data.war));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || t("orderDetails.paymentError"));
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrint = () => {
    if (!order || !items || !bill) return;
    printCustomerBill(order, items, bill, locale);
  };

  const handleKitchenBill = async () => {
    if (!order || !items) return;

    try {
      // Filter items with pending status
      const pendingItems = items.filter((item) => item.status === "pending");

      if (pendingItems.length === 0) {
        printKitchenBill(order, items, locale);
        return;
      }

      // Print kitchen bill for pending items
      printKitchenBill(order, pendingItems, locale);

      // Update status of all pending items to in-progress - SINGLE API CALL
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update item status");
      }

      const result = await res.json();

      // Show success message
      toast.success(t("orderDetails.statusChanged"));

      // Refresh order details to get updated statuses
      fetchOrderDetails();
    } catch (err) {
      console.error("Error updating item status:", err);
      toast.error(t("orderDetails.statusFailed"));
    }
  };

  if (loading) {
    return (
      <PageContainer title={t("orderDetails.title", { id: orderId })}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--color-primary)]"></div>
        </div>
      </PageContainer>
    );
  }

  if (!order) {
    return (
      <PageContainer title={t("orderDetails.title", { id: orderId })}>
        <p className="text-center text-red-500 mt-10">{t("orderDetails.notFound")}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t("orderDetails.title", { id: orderId })}>
      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t("orderDetails.confirmPayment")}
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("orderDetails.totalAmount")}</span>
                <span>{formatMoney(total)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">{t("orderDetails.discount")}</span>
                <span className="text-red-500">
                  -{formatMoney(discount)}
                </span>
              </div>

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t("orderDetails.finalAmount")}</span>
                <span className="text-[color:var(--color-primary)]">
                  {formatMoney(total - discount)}
                </span>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              {t("orderDetails.confirmQuestion")}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handlePayment}
                disabled={paymentLoading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  paymentLoading
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-[color:var(--color-primary)] text-white hover:opacity-90"
                }`}
              >
                {paymentLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("orderDetails.paying")}
                  </span>
                ) : (
                  t("orderDetails.confirmPayment")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 relative">
        {/* Right Column - Order Items */}
        <div className="space-y-4 md:p-3 lg:p-6">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {t("orderDetails.noItems")}
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full border-collapse mb-5">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-start">
                      {t("orderDetails.colName")}
                    </th>
                    <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-center">
                      {t("orderDetails.colQty")}
                    </th>
                    <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-end">
                      {t("orderDetails.colPrice")}
                    </th>
                    <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700 text-end">
                      {t("common.total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2 sm:px-4 font-medium text-gray-900">
                        {item.menu_item}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                          {formatNumber(item.qty)}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-gray-600 text-end whitespace-nowrap">
                        {formatMoney(item.price)}
                      </td>
                      <td className="py-3 px-2 sm:px-4 font-semibold text-[color:var(--color-primary)] text-end whitespace-nowrap">
                        {formatMoney(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={() => router.push("/main/orders")}
              className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-xl font-medium hover:bg-gray-400 transition-colors"
            >
              {t("orderDetails.backToOrders")}
            </button>

            {order.status === "open" && (
              <button
                onClick={handleKitchenBill}
                className="flex-1 px-4 py-3 bg-[color:var(--color-primary)] text-white rounded-xl font-medium hover:bg-[color:var(--color-primary-light)] transition-colors"
              >
                {t("orderDetails.printKitchen")}
              </button>
            )}
          </div>
        </div>

        <div className="hidden lg:block absolute inset-y-0 start-1/2 w-px bg-gray-300" />

        {/* Left Column - Order Info & Actions */}
        <div className="space-y-4 md:p-3 lg:p-6">
          {order.status === "closed" && bill ? (
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-lg">
              <h3 className="text-lg font-bold text-center text-gray-900 mb-4 border-b pb-2">
                {t("orderDetails.billDetails")}
              </h3>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("orderDetails.orderNumber")}</span>
                  <span className="font-medium">{order.order_id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">{t("orderDetails.billNumber")}</span>
                  <span className="font-medium">{bill.bill_id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">{t("orderDetails.table")}</span>
                  <span className="font-medium">{order.table_no}</span>
                </div>

                <hr className="my-2 border-dashed" />

                <div className="flex justify-between">
                  <span className="text-gray-600">{t("orderDetails.amountDueColon")}</span>
                  <span>{formatMoney(bill.subtotal || 0)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">{t("orderDetails.discount")}</span>
                  <span className="text-red-500">
                    {formatMoney(bill.discount || 0)}
                  </span>
                </div>

                <div className="flex justify-between text-base font-bold text-gray-900 bg-gray-50 p-2 rounded-md">
                  <span>{t("orderDetails.finalAmount")}</span>
                  <span>{formatMoney(bill.total_amount || 0)}</span>
                </div>

                <div className="flex justify-between text-xs text-gray-500 pt-2 border-t mt-2">
                  <span>{t("orderDetails.paymentDate")}</span>
                  <span>
                    {bill.created_at && formatDate(bill.created_at)}
                  </span>
                </div>

                <button
                  onClick={handlePrint}
                  className="mt-6 w-full px-6 py-3 bg-[color:var(--color-primary)] text-white rounded-xl font-medium hover:bg-[color:var(--color-primary-light)] transition-colors"
                >
                  {t("orderDetails.printBill")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                <p className="font-bold text-gray-900">{t("common.tableNo", { no: order.table_no })}</p>
                <p className="font-bold text-gray-900 text-sm sm:text-base">{formatDateTime(order.created_at)}</p>
              </div>

              <div className="bg-[#E6F4F1] p-4 rounded-lg border-s-4 border-[color:var(--color-primary-light)]">
                <p className="text-sm text-[color:var(--color-primary-light)] mb-1">
                  {t("orderDetails.amountDue")}
                </p>
                <p className="font-bold text-2xl text-[color:var(--color-primary-light)]">
                  {formatMoney(total || 0)}
                </p>
              </div>

              <div className="bg-[#E6F4F1] p-3 rounded-lg text-center">
                <p
                  className={`text-sm font-medium ${
                    order.status === "open" || order.status === "cancelled"
                      ? "text-red-600"
                      : "text-[color:var(--color-primary-light)]"
                  }`}
                >
                  {t("orderDetails.statusLabel")}{" "}
                  {order.status === "open"
                    ? t("orderDetails.statusActive")
                    : order.status === "cancelled"
                    ? t("orderDetails.statusCancelled")
                    : t("orderDetails.statusPaid")}
                </p>
              </div>

              {(role === "manager" || role === "cashier") &&
                order.status === "open" && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("orderDetails.discountInput")}
                    </label>
                    <input
                      type="number"
                      placeholder={t("orderDetails.discountPlaceholder")}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      min="0"
                      max={total}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[color:var(--color-primary)] focus:outline-none transition-all duration-200"
                    />
                    {discount > total && (
                      <p className="text-red-500 text-xs mt-1">
                        {t("orderDetails.discountTooHigh")}
                      </p>
                    )}
                  </div>
                )}

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {role === "waiter" && order.status === "open" && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors text-white ${
                      cancelLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[color:var(--color-danger)] hover:opacity-90"
                    }`}
                  >
                    {cancelLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t("orderDetails.cancelling")}
                      </span>
                    ) : (
                      t("orderDetails.cancelOrder")
                    )}
                  </button>
                )}

                {(role === "manager" || role === "cashier") &&
                  order.status === "open" && (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={cancelLoading}
                        className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors text-white ${
                          cancelLoading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-[color:var(--color-danger)] hover:opacity-90"
                        }`}
                      >
                        {cancelLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {t("orderDetails.cancelling")}
                          </span>
                        ) : (
                          t("orderDetails.cancelOrder")
                        )}
                      </button>

                      {!order.paid && (
                        <button
                          onClick={handlePaymentConfirm}
                          disabled={
                            paymentLoading || discount > total || discount < 0
                          }
                          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                            paymentLoading || discount > total || discount < 0
                              ? "bg-gray-400 cursor-not-allowed text-white"
                              : "bg-[color:var(--color-primary)] text-white hover:opacity-90"
                          }`}
                        >
                          {t("orderDetails.confirmPayment")}
                        </button>
                      )}
                    </>
                  )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
