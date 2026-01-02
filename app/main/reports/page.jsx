"use client";

import React, { useState } from "react";
import { printReport } from "@/utils/printReport";
import {
  FaChartBar,
  FaShoppingCart,
  FaMoneyBillWave,
  FaUtensils,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  reportSchema,
  validateField,
  validateForm,
} from "@/schemas/reportSchema";
import DataTable from "@/components/dataTable";
import { formatJalaliDate } from "@/utils/dateUtils";

export default function ReportsPage() {
  const [formData, setFormData] = useState({ startDate: "", endDate: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [currentReportType, setCurrentReportType] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const { error } = validateField(reportSchema, name, formData[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleGenerateReport = async (reportType) => {
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach((key) => (allTouched[key] = true));
    setTouched(allTouched);

    // Validate form data
    const validationData = {
      reportType,
      startDate: formData.startDate,
      endDate: formData.endDate,
    };

    const { isValid, errors: formErrors } = validateForm(
      reportSchema,
      validationData
    );
    setErrors(formErrors);

    if (!isValid) {
      // Show the first error to the user
      const firstErrorKey = Object.keys(formErrors)[0];
      if (firstErrorKey) {
        toast.error(formErrors[firstErrorKey]);
      }
      return;
    }

    setLoading(true);
    setCurrentReportType(reportType);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationData),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Api Error");

      console.log(result.data);
      setReportData(result.data || []);
      toast.success("گزارش با موفقیت تولید شد");
    } catch (error) {
      console.log("Error generating report: ", error);
      toast.error("خطا در تولید گزارش");
    } finally {
      setLoading(false);
    }
  };

  const getReportName = (type) => {
    const map = {
      sales: "فروش",
      financial: "مالی",
      orders: "سفارشات",
      products: "محصولات",
    };
    return map[type] || type;
  };

  const handleQuickReport = (days) => {
    const today = new Date();
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));

    const format = (date) => date.toISOString().split("T")[0];

    const newFormData = {
      startDate: format(start),
      endDate: format(end),
    };

    setFormData(newFormData);

    // Clear errors when setting dates via quick report
    setErrors({});
  };

  const handlePrint = () => {
    if (reportData.length === 0) {
      toast.error("داده‌ای برای چاپ وجود ندارد");
      return;
    }
    toast.success("آماده برای چاپ...");
    printReport(
      reportData,
      getColumns(currentReportType),
      `گزارش ${getReportName(currentReportType)}`
    );
  };

  const reportButtons = [
    {
      type: "sales",
      icon: <FaChartBar className="text-blue-500 text-xl" />,
      title: "گزارش فروش",
      desc: "گزارش کامل فروش و درآمد",
    },
    {
      type: "orders",
      icon: <FaShoppingCart className="text-green-500 text-xl" />,
      title: "گزارش سفارشات",
      desc: "سفارشات و وضعیت آن‌ها",
    },
    {
      type: "financial",
      icon: <FaMoneyBillWave className="text-purple-500 text-xl" />,
      title: "گزارش مالی",
      desc: "وضعیت مالی و تراکنش‌ها",
    },
    {
      type: "products",
      icon: <FaUtensils className="text-red-500 text-xl" />,
      title: "گزارش محصولات",
      desc: "عملکرد و فروش محصولات",
    },
  ];

  const getColumns = (type) => {
    switch (type) {
      case "sales":
        return [
          {
            key: "date",
            header: "تاریخ",
            render: (value) => formatJalaliDate(value),
          },

          {
            key: "total_orders",
            header: "تعداد سفارش‌ها",
          },
          {
            key: "total_sales",
            header: "مجموع فروش",
            render: (value) => `${value?.toLocaleString()} ؋`,
          },
          {
            key: "total_discount",
            header: "تخفیف",
            render: (value) => `${value?.toLocaleString()} ؋`,
          },
          {
            key: "net_sales",
            header: "مجموع",
            render: (value) => `${value?.toLocaleString()} ؋`,
          },
        ];
      case "products":
        return [
          { key: "product_name", header: "نام محصول" },
          { key: "total_qty", header: "تعداد فروخته شده" },
          {
            key: "total_sales",
            header: "درآمد کل",
            render: (value) => `${value?.toLocaleString()} ؋`,
          },
          {
            key: "sales_percentage",
            header: "درصد فروش",
            render: (value) => `${value?.toLocaleString()}%`,
          },
        ];
      case "financial":
        return [
          {
            key: "total_sales",
            header: "مجموع فروش",
            render: (value) => `${value?.toLocaleString()} ؋`,
          },
          {
            key: "total_discount",
            header: "تخفیف",
            render: (value) => `${value?.toLocaleString()} ؋`,
          },
          {
            key: "net_income",
            header: "مجموع",
            render: (value) => `${value?.toLocaleString()} ؋`,
          },
        ];
      case "orders":
        return [
          { key: "order_id", header: "شماره سفارش" },
          { key: "table_no", header: "شماره میز" },
          {
            key: "status",
            header: "وضعیت",
            render: (value) => {
              switch (value) {
                case "cancelled":
                  return (
                    <span className="text-red-600 font-medium">لغو شده</span>
                  );
                case "closed":
                  return (
                    <span className="text-green-600 font-medium">
                      تکمیل شده
                    </span>
                  );
                case "open":
                  return (
                    <span className="text-yellow-600 font-medium">باز</span>
                  );
                default:
                  return (
                    <span className="text-gray-600 font-medium">{value}</span>
                  );
              }
            },
          },
          {
            key: "total_amount",
            header: "مبلغ قابل پرداخت",
            render: (value) => `${value?.toLocaleString()} ؋`,
          },
        ];
      default:
        return [];
    }
  };

  const isFormValid =
    formData.startDate &&
    formData.endDate &&
    !errors.startDate &&
    !errors.endDate;

  return (
    <div className="min-h-screen p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
          گزارشات
        </h1>
      </div>

      {/* Date Selection */}
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm mb-1">تاریخ شروع</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              onBlur={handleBlur}
              lang="fa-Af"
              className={`w-full p-3 bg-white border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.startDate && touched.startDate
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]/20"
              }`}
            />
            {errors.startDate && touched.startDate && (
              <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">تاریخ پایان</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              onBlur={handleBlur}
              lang="fa-Af"
              className={`w-full p-3 bg-white border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.endDate && touched.endDate
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]/20"
              }`}
            />
            {errors.endDate && touched.endDate && (
              <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Quick Selection */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => handleQuickReport(1)}
            className="px-3 py-1 bg-gray-100 rounded text-sm border border-gray-200 hover:bg-gray-200 transition-colors"
          >
            امروز
          </button>
          <button
            onClick={() => handleQuickReport(7)}
            className="px-3 py-1 bg-gray-100 rounded text-sm border border-gray-200 hover:bg-gray-200 transition-colors"
          >
            ۷ روز
          </button>
          <button
            onClick={() => handleQuickReport(30)}
            className="px-3 py-1 bg-gray-100 rounded text-sm border border-gray-200 hover:bg-gray-200 transition-colors"
          >
            ۳۰ روز
          </button>
        </div>
      </div>

      {/* Report Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {reportButtons.map((report) => (
          <button
            key={report.type}
            onClick={() => handleGenerateReport(report.type)}
            disabled={loading || !isFormValid}
            className="bg-white p-4 rounded-lg shadow-md border-1 border-gray-200 text-right transition hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between mb-2">
              {report.icon}
              <h3 className="font-semibold">{report.title}</h3>
            </div>
            <p className="text-sm text-gray-600">{report.desc}</p>
          </button>
        ))}
      </div>

      {/* DataTable with Print Button */}
      <DataTable
        title={`گزارش ${getReportName(currentReportType)}`}
        data={reportData}
        columns={getColumns(currentReportType)}
        loading={loading}
        onPrint={handlePrint}
        showTotalsRow={!["financial"].includes(currentReportType)}
      />

      {loading && (
        <div className="bg-white bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[color:var(--color-primary)] mx-auto mb-4"></div>
            <p className="text-gray-600">در حال تولید گزارش...</p>
          </div>
        </div>
      )}
    </div>
  );
}
