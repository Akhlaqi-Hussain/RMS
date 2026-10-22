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
import { useLanguage } from "@/context/LanguageContext";

export default function ReportsPage() {
  const [formData, setFormData] = useState({ startDate: "", endDate: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [currentReportType, setCurrentReportType] = useState("");
  const { t, locale, formatDate, formatMoney, formatNumber } = useLanguage();

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
        toast.error(t(formErrors[firstErrorKey]));
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
      toast.success(t("reports.created"));
    } catch (error) {
      console.log("Error generating report: ", error);
      toast.error(t("reports.failed"));
    } finally {
      setLoading(false);
    }
  };

  const getReportName = (type) => {
    return ["sales", "financial", "orders", "products"].includes(type)
      ? t(`reports.name.${type}`)
      : type;
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
      toast.error(t("reports.nothingToPrint"));
      return;
    }
    toast.success(t("reports.readyToPrint"));
    printReport(
      reportData,
      getColumns(currentReportType),
      t("reports.reportTitle", { name: getReportName(currentReportType) }),
      locale
    );
  };

  const reportButtons = [
    {
      type: "sales",
      icon: <FaChartBar className="text-blue-500 text-xl" />,
      title: t("reports.salesTitle"),
      desc: t("reports.salesDesc"),
    },
    {
      type: "orders",
      icon: <FaShoppingCart className="text-green-500 text-xl" />,
      title: t("reports.ordersTitle"),
      desc: t("reports.ordersDesc"),
    },
    {
      type: "financial",
      icon: <FaMoneyBillWave className="text-purple-500 text-xl" />,
      title: t("reports.financialTitle"),
      desc: t("reports.financialDesc"),
    },
    {
      type: "products",
      icon: <FaUtensils className="text-red-500 text-xl" />,
      title: t("reports.productsTitle"),
      desc: t("reports.productsDesc"),
    },
  ];

  const getColumns = (type) => {
    switch (type) {
      case "sales":
        return [
          {
            key: "date",
            header: t("reports.colDate"),
            render: (value) => formatDate(value),
          },

          {
            key: "total_orders",
            header: t("reports.colOrderCount"),
            render: (value) => formatNumber(value),
          },
          {
            key: "total_sales",
            header: t("reports.colTotalSales"),
            render: (value) => formatMoney(value),
          },
          {
            key: "total_discount",
            header: t("reports.colDiscount"),
            render: (value) => formatMoney(value),
          },
          {
            key: "net_sales",
            header: t("common.total"),
            render: (value) => formatMoney(value),
          },
        ];
      case "products":
        return [
          { key: "product_name", header: t("reports.colProduct") },
          {
            key: "total_qty",
            header: t("reports.colQtySold"),
            render: (value) => formatNumber(value),
          },
          {
            key: "total_sales",
            header: t("reports.colRevenue"),
            render: (value) => formatMoney(value),
          },
          {
            key: "sales_percentage",
            header: t("reports.colShare"),
            render: (value) => `${formatNumber(value)}%`,
          },
        ];
      case "financial":
        return [
          {
            key: "total_sales",
            header: t("reports.colTotalSales"),
            render: (value) => formatMoney(value),
          },
          {
            key: "total_discount",
            header: t("reports.colDiscount"),
            render: (value) => formatMoney(value),
          },
          {
            key: "net_income",
            header: t("common.total"),
            render: (value) => formatMoney(value),
          },
        ];
      case "orders":
        return [
          { key: "order_id", header: t("reports.colOrderNumber") },
          { key: "table_no", header: t("reports.colTableNumber") },
          {
            key: "status",
            header: t("common.status"),
            render: (value) => {
              switch (value) {
                case "cancelled":
                  return (
                    <span className="text-red-600 font-medium">{t("reports.statusCancelled")}</span>
                  );
                case "closed":
                  return (
                    <span className="text-green-600 font-medium">
                      {t("reports.statusClosed")}
                    </span>
                  );
                case "open":
                  return (
                    <span className="text-yellow-600 font-medium">{t("reports.statusOpen")}</span>
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
            header: t("reports.colAmountDue"),
            render: (value) => formatMoney(value),
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
    <div className="min-h-screen p-1 sm:p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
          {t("reports.title")}
        </h1>
      </div>

      {/* Date Selection */}
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm mb-1">{t("reports.startDate")}</label>
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
              <p className="text-red-500 text-xs mt-1">{t(errors.startDate)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">{t("reports.endDate")}</label>
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
              <p className="text-red-500 text-xs mt-1">{t(errors.endDate)}</p>
            )}
          </div>
        </div>

        {/* Quick Selection */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => handleQuickReport(1)}
            className="px-3 py-1 bg-gray-100 rounded text-sm border border-gray-200 hover:bg-gray-200 transition-colors"
          >
            {t("reports.today")}
          </button>
          <button
            onClick={() => handleQuickReport(7)}
            className="px-3 py-1 bg-gray-100 rounded text-sm border border-gray-200 hover:bg-gray-200 transition-colors"
          >
            {t("reports.days", { count: formatNumber(7) })}
          </button>
          <button
            onClick={() => handleQuickReport(30)}
            className="px-3 py-1 bg-gray-100 rounded text-sm border border-gray-200 hover:bg-gray-200 transition-colors"
          >
            {t("reports.days", { count: formatNumber(30) })}
          </button>
        </div>
      </div>

      {/* Report Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {reportButtons.map((report) => (
          <button
            key={report.type}
            onClick={() => handleGenerateReport(report.type)}
            disabled={loading || !isFormValid}
            className="bg-white p-4 rounded-lg shadow-md border-1 border-gray-200 text-start transition hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              {report.icon}
              <h3 className="font-semibold">{report.title}</h3>
            </div>
            <p className="text-sm text-gray-600">{report.desc}</p>
          </button>
        ))}
      </div>

      {/* DataTable with Print Button */}
      <DataTable
        title={t("reports.reportTitle", { name: getReportName(currentReportType) })}
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
            <p className="text-gray-600">{t("reports.generating")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
