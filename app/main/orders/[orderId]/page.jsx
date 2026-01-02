"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/components/pageContainer";
import toast from "react-hot-toast";
import { printCustomerBill, printKitchenBill } from "@/utils/printBill";
import { formatJalaliDate, formatTime } from "@/utils/dateUtils";

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

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      const data = await res.json();
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
    } catch (err) {
      console.error("Error fetching order details:", err);
      toast.error("خطا در دریافت جزئیات سفارش");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrderDetails();
  }, [orderId]);

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
      toast.success("سفارش لغو شد!");
    } catch (err) {
      console.error(err);
      toast.error("خطا در لغو سفارش");
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePaymentConfirm = () => {
    // Validate discount amount
    if (discount > total) {
      toast.error("مقدار تخفیف نمی‌تواند بیشتر از مبلغ قابل پرداخت باشد");
      return;
    }

    if (discount < 0) {
      toast.error("مقدار تخفیف نمی‌تواند منفی باشد");
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
      if (!res.ok) throw new Error(data.error || "پرداخت انجام نشد");

      fetchOrderDetails();
      setShowPaymentConfirm(false);

      if (data.message) {
        toast.success("پرداخت تایید شد!");
      } else if (data.war) {
        toast.error(data.war);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "خطا در پرداخت");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrint = () => {
    if (!order || !items || !bill) return;
    printCustomerBill(order, items, bill);
  };

  const handleKitchenBill = async () => {
    if (!order || !items) return;

    try {
      // Filter items with pending status
      const pendingItems = items.filter((item) => item.status === "pending");

      if (pendingItems.length === 0) {
        printKitchenBill(order, items);
        return;
      }

      // Print kitchen bill for pending items
      printKitchenBill(order, pendingItems);

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
      toast.success(`وضعیت آیتم تغییر کرد`);

      // Refresh order details to get updated statuses
      fetchOrderDetails();
    } catch (err) {
      console.error("Error updating item status:", err);
      toast.error("خطا در بروزرسانی وضعیت آیتم‌ها");
    }
  };

  if (loading) {
    return (
      <PageContainer title={`جزئیات سفارش (${orderId})`}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--color-primary)]"></div>
        </div>
      </PageContainer>
    );
  }

  if (!order) {
    return (
      <PageContainer title={`جزئیات سفارش (${orderId})`}>
        <p className="text-center text-red-500 mt-10">سفارش پیدا نشد!</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`جزئیات سفارش (${orderId})`}>
      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              تایید پرداخت
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">مبلغ کل:</span>
                <span>{total.toLocaleString()} ؋</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">تخفیف:</span>
                <span className="text-red-500">
                  -{discount.toLocaleString()} ؋
                </span>
              </div>

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>مبلغ نهایی:</span>
                <span className="text-[color:var(--color-primary)]">
                  {(total - discount).toLocaleString()} ؋
                </span>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              آیا از تایید پرداخت این سفارش اطمینان دارید؟
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                انصراف
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
                    در حال پرداخت...
                  </span>
                ) : (
                  "تایید پرداخت"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        {/* Right Column - Order Items */}
        <div className="space-y-4 md:p-3 lg:p-6">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              هیچ آیتمی ثبت نشده است.
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full border-collapse mb-5">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 font-semibold text-gray-700 text-right">
                      نام
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-center">
                      تعداد
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-left">
                      قیمت
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-left">
                      مجموع
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {item.menu_item}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                          {item.qty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {item.price.toLocaleString()} ؋
                      </td>
                      <td className="py-3 px-4 font-semibold text-[color:var(--color-primary)]">
                        {item.total_price.toLocaleString()} ؋
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => router.push("/main/orders")}
              className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-xl font-medium hover:bg-gray-400 transition-colors"
            >
              بازگشت به سفارش‌ها
            </button>

            {order.status === "open" && (
              <button
                onClick={handleKitchenBill}
                className="flex-1 px-4 py-3 bg-[color:var(--color-primary)] text-white rounded-xl font-medium hover:bg-[color:var(--color-primary-light)] transition-colors"
              >
                چاپ فاکتور آشپزخانه
              </button>
            )}
          </div>
        </div>

        <div className="hidden lg:block absolute inset-y-0 left-1/2 w-px bg-gray-300" />

        {/* Left Column - Order Info & Actions */}
        <div className="space-y-4 md:p-3 lg:p-6">
          {order.status === "closed" && bill ? (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
              <h3 className="text-lg font-bold text-center text-gray-900 mb-4 border-b pb-2">
                جزئیات فاکتور
              </h3>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600">شماره سفارش:</span>
                  <span className="font-medium">{order.order_id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">شماره فاکتور:</span>
                  <span className="font-medium">{bill.bill_id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">میز:</span>
                  <span className="font-medium">{order.table_no}</span>
                </div>

                <hr className="my-2 border-dashed" />

                <div className="flex justify-between">
                  <span className="text-gray-600">مبلغ قابل پرداخت:</span>
                  <span>{(bill.subtotal || 0).toLocaleString()} ؋</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">تخفیف:</span>
                  <span className="text-red-500">
                    {(bill.discount || 0).toLocaleString()} ؋
                  </span>
                </div>

                <div className="flex justify-between text-base font-bold text-gray-900 bg-gray-50 p-2 rounded-md">
                  <span>مبلغ نهایی:</span>
                  <span>{(bill.total_amount || 0).toLocaleString()} ؋</span>
                </div>

                <div className="flex justify-between text-xs text-gray-500 pt-2 border-t mt-2">
                  <span>تاریخ پرداخت:</span>
                  <span>
                    {bill.created_at && formatJalaliDate(bill.created_at)}
                  </span>
                </div>

                <button
                  onClick={handlePrint}
                  className="mt-6 w-full px-6 py-3 bg-[color:var(--color-primary)] text-white rounded-xl font-medium hover:bg-[color:var(--color-primary-light)] transition-colors"
                >
                  چاپ فاکتور
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center pt-2">
                <p className="font-bold text-gray-900">میز {order.table_no}</p>
                <p className="font-bold text-gray-900">{order.created_at}</p>
              </div>

              <div className="bg-[#E6F4F1] p-4 rounded-lg border-r-4 border-[color:var(--color-primary-light)]">
                <p className="text-sm text-[color:var(--color-primary-light)] mb-1">
                  مبلغ قابل پرداخت
                </p>
                <p className="font-bold text-2xl text-[color:var(--color-primary-light)]">
                  {(total || 0).toLocaleString()} ؋
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
                  وضعیت:{" "}
                  {order.status === "open"
                    ? "فعال"
                    : order.status === "cancelled"
                    ? "لغو شده"
                    : "پرداخت شده"}
                </p>
              </div>

              {(role === "manager" || role === "cashier") &&
                order.status === "open" && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      تخفیف (؋)
                    </label>
                    <input
                      type="number"
                      placeholder="مقدار تخفیف را وارد کنید"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      min="0"
                      max={total}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[color:var(--color-primary)] focus:outline-none transition-all duration-200"
                    />
                    {discount > total && (
                      <p className="text-red-500 text-xs mt-1">
                        مقدار تخفیف نمی‌تواند بیشتر از مبلغ قابل پرداخت باشد
                      </p>
                    )}
                  </div>
                )}

              <div className="flex gap-3 mt-6">
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
                        در حال لغو...
                      </span>
                    ) : (
                      "لغو سفارش"
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
                            در حال لغو...
                          </span>
                        ) : (
                          "لغو سفارش"
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
                          تایید پرداخت
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
